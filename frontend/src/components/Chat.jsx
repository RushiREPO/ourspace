import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { encryptMessage, decryptMessage, deriveKey } from '../utils/crypto'
import './Chat.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const REACTIONS = ['❤️', '😍', '😂', '😮', '😢', '🔥']
const EMOJI_PICKER = ['😀', '😇', '😍', '🥰', '😎', '🤩', '😱', '😴', '😇', '🫶', '❤️', '🔥', '🥳', '😡', '😂', '😢', '🤪', '🙌', '💖', '✨']
const ICE_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function Chat({ user, token, password, onLogout }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [typing, setTyping] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [connected, setConnected] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState(null)
  const [reactionMenu, setReactionMenu] = useState(null) // messageId
  const [partnerUser, setPartnerUser] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [callState, setCallState] = useState('idle') // idle, calling, incoming, in-call
  const [incomingCallInfo, setIncomingCallInfo] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)

  const socketRef = useRef(null)
  const peerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const typingTimerRef = useRef(null)
  const inputRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const fileInputRef = useRef(null)

  // Derive encryption key from user ID and password
  useEffect(() => {
    if (user && password) {
      const key = deriveKey(user.id, password)
      setEncryptionKey(key)
    }
  }, [user, password])

  // Fetch message history
  useEffect(() => {
    fetch(`${API_URL}/api/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Decrypt messages
          const decryptedMessages = data.map(msg => {
            if (msg.isEncrypted && encryptionKey && msg.text) {
              const decryptedText = decryptMessage(msg.text, encryptionKey)
              return { ...msg, text: decryptedText }
            }
            return msg
          })
          setMessages(decryptedMessages)
        }
      })
      .catch(console.error)
  }, [token, encryptionKey])

  // Connect socket
  useEffect(() => {
    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('message', (msg) => {
      // Decrypt message if encrypted
      if (msg.isEncrypted && encryptionKey && msg.text) {
        const decryptedText = decryptMessage(msg.text, encryptionKey)
        setMessages(prev => [...prev, { ...msg, text: decryptedText }])
      } else {
        setMessages(prev => [...prev, msg])
      }
    })

    socket.on('file_message', (msg) => {
      // Decrypt message if encrypted
      if (msg.isEncrypted && encryptionKey && msg.text) {
        const decryptedText = decryptMessage(msg.text, encryptionKey)
        setMessages(prev => [...prev, { ...msg, text: decryptedText }])
      } else {
        setMessages(prev => [...prev, msg])
      }
    })

    socket.on('typing_users', (users) => {
      setTyping(users.filter(id => id !== user.id))
    })

    socket.on('online_users', (userIds) => {
      setOnlineUsers(userIds)
    })

    socket.on('message_reaction', ({ messageId, reaction }) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reaction } : m
      ))
    })

    socket.on('call_offer', ({ fromUserId, offer, type }) => {
      setIncomingCallInfo({ fromUserId, offer, type })
      setCallState('incoming')
    })

    socket.on('call_answer', async ({ answer }) => {
      if (!peerRef.current) return
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer))
      setCallState('in-call')
    })

    socket.on('ice_candidate', async ({ candidate }) => {
      if (!peerRef.current) return
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.warn('Failed add ICE candidate', e)
      }
    })

    socket.on('end_call', () => {
      cleanupCall()
    })

    return () => {
      socket.disconnect()
      cleanupCall()
    }
  }, [token, user.id, localStream, encryptionKey])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const handleTyping = (e) => {
    setInputText(e.target.value)
    socketRef.current?.emit('typing_start')
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop')
    }, 1500)
  }

  const sendMessage = useCallback((e) => {
    e?.preventDefault()
    const text = inputText.trim()
    if (!text && !selectedFile || !socketRef.current || !encryptionKey) return

    if (selectedFile) {
      sendFile()
    } else {
      // Encrypt message before sending
      const encryptedText = encryptMessage(text, encryptionKey)
      socketRef.current.emit('send_message', { 
        text: encryptedText,
        isEncrypted: true
      })
      setInputText('')
      clearTimeout(typingTimerRef.current)
      socketRef.current.emit('typing_stop')
      inputRef.current?.focus()
    }
  }, [inputText, selectedFile, encryptionKey])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const addEmoji = (emoji) => {
    setInputText((prev) => `${prev}${emoji}`)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select an image (jpg, png, gif, webp) or video (mp4, webm, ogg) file.')
      return
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.')
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setFilePreview({
        url: e.target.result,
        type: file.type,
        name: file.name
      })
    }
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sendFile = useCallback(async (e) => {
    e?.preventDefault()
    if (!selectedFile || !socketRef.current || !encryptionKey) return

    const reader = new FileReader()
    reader.onload = () => {
      const fileData = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        data: reader.result // base64
      }

      socketRef.current.emit('send_file', { 
        file: fileData, 
        text: encryptMessage(inputText.trim(), encryptionKey),
        isEncrypted: true
      })
      setInputText('')
      removeFile()
      clearTimeout(typingTimerRef.current)
      socketRef.current.emit('typing_stop')
      inputRef.current?.focus()
    }
    reader.readAsDataURL(selectedFile)
  }, [selectedFile, inputText, encryptionKey])

  const sendReaction = (messageId, reaction) => {
    socketRef.current?.emit('react_message', { messageId, reaction })
    setReactionMenu(null)
  }

  const getPartnerId = () => onlineUsers.find((id) => id !== user.id) || null

  const cleanupCall = () => {
    peerRef.current?.close()
    peerRef.current = null
    localStream?.getTracks().forEach((track) => track.stop())
    setLocalStream(null)
    setRemoteStream(null)
    setCallState('idle')
    setIncomingCallInfo(null)
  }

  const createPeer = (targetUserId) => {
    if (!socketRef.current) return null
    const peer = new RTCPeerConnection(ICE_CONFIG)

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice_candidate', {
          targetUserId,
          candidate: event.candidate
        })
      }
    }

    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream))
    }

    peerRef.current = peer
    return peer
  }

  const startCall = async (type) => {
    const targetId = getPartnerId()
    if (!targetId) return

    try {
      const constraints = type === 'video' ? { audio: true, video: true } : { audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream(stream)
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const peer = createPeer(targetId)
      if (!peer) return

      stream.getTracks().forEach((track) => peer.addTrack(track, stream))

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      socketRef.current.emit('call_offer', { targetUserId: targetId, offer, type })
      setCallState('calling')
    } catch (err) {
      console.error('Start call failed', err)
      cleanupCall()
    }
  }

  const acceptCall = async () => {
    if (!incomingCallInfo) return
    const { fromUserId, offer, type } = incomingCallInfo

    try {
      const constraints = type === 'video' ? { audio: true, video: true } : { audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream(stream)
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const peer = createPeer(fromUserId)
      if (!peer) return

      stream.getTracks().forEach((track) => peer.addTrack(track, stream))

      await peer.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)

      socketRef.current.emit('call_answer', { targetUserId: fromUserId, answer })
      setCallState('in-call')
      setIncomingCallInfo(null)
    } catch (err) {
      console.error('Accept call failed', err)
      cleanupCall()
    }
  }

  const rejectCall = () => {
    if (!incomingCallInfo) return
    socketRef.current.emit('end_call', { targetUserId: incomingCallInfo.fromUserId })
    setIncomingCallInfo(null)
    setCallState('idle')
  }

  const endCall = () => {
    const targetId = getPartnerId()
    if (targetId && socketRef.current) {
      socketRef.current.emit('end_call', { targetUserId: targetId })
    }
    cleanupCall()
  }

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const label = formatDateLabel(msg.timestamp)
    if (!acc.length || acc[acc.length - 1].label !== label) {
      acc.push({ label, messages: [msg] })
    } else {
      acc[acc.length - 1].messages.push(msg)
    }
    return acc
  }, [])

  const isOnline = (userId) => onlineUsers.includes(userId)
  const partnerOnline = onlineUsers.some(id => id !== user.id)

  // Find partner info from last message
  const partnerInfo = messages.find(m => m.userId !== user.id)

  return (
    <div className="chat-container" onClick={() => setReactionMenu(null)}>
      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <div className="header-avatars">
            <div className="avatar mine" title={user.username} style={{ borderColor: user.color }}>
              {user.avatar}
            </div>
            {partnerInfo && (
              <div className="avatar partner" title={partnerInfo.username} style={{ borderColor: partnerInfo.color }}>
                {partnerInfo.avatar}
                {partnerOnline && <div className="online-dot" />}
              </div>
            )}
          </div>
          <div className="header-info">
            <h2>Just Us 💞</h2>
            <span className={`status ${partnerOnline ? 'online' : 'offline'}`}>
              {partnerOnline
                ? (typing.length > 0 ? `${partnerInfo?.username || 'Partner'} is typing...` : `${partnerInfo?.username || 'Partner'} is online`)
                : 'Waiting for your partner...'}
            </span>
          </div>
        </div>
        <div className="header-right">
          <div className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} title={connected ? 'Connected' : 'Reconnecting...'} />          <button className="call-btn" onClick={() => startCall('audio')} disabled={!partnerOnline} title="Audio call">
            🎧
          </button>
          <button className="call-btn" onClick={() => startCall('video')} disabled={!partnerOnline} title="Video call">
            📹
          </button>          <button className="logout-btn" onClick={onLogout} title="Sign out">
            ↩
          </button>
        </div>
      </header>

      {filePreview && (
        <div className="file-preview">
          <div className="file-preview-content">
            {filePreview.type.startsWith('image/') ? (
              <img src={filePreview.url} alt={filePreview.name} className="file-preview-media" />
            ) : (
              <video src={filePreview.url} controls className="file-preview-media" />
            )}
            <div className="file-preview-info">
              <span>{filePreview.name}</span>
              <button onClick={removeFile} className="remove-file-btn">✕</button>
            </div>
          </div>
        </div>
      )}

      {callState === 'incoming' && incomingCallInfo && (
        <div className="incoming-call-box">
          <p>{`Incoming ${incomingCallInfo.type} call...`}</p>
          <button onClick={acceptCall}>Accept</button>
          <button onClick={rejectCall}>Reject</button>
        </div>
      )}

      {(callState === 'calling' || callState === 'in-call') && (
        <div className="call-panel">
          <div className="local-video-box">
            <video ref={localVideoRef} autoPlay muted playsInline className="video-view" />
            <span>Me</span>
          </div>
          <div className="remote-video-box">
            <video ref={remoteVideoRef} autoPlay playsInline className="video-view" srcObject={remoteStream} />
            <span>Partner</span>
          </div>
          <button className="end-call-btn" onClick={endCall}>End Call</button>
        </div>
      )}

      {/* Messages */}
      <main className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💌</div>
            <p>Your conversation starts here.</p>
            <span>Send the first message...</span>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.label}>
            <div className="date-label">{group.label}</div>
            {group.messages.map((msg, idx) => {
              const isMe = msg.userId === user.id
              const prevMsg = group.messages[idx - 1]
              const isGrouped = prevMsg && prevMsg.userId === msg.userId &&
                (new Date(msg.timestamp) - new Date(prevMsg.timestamp)) < 60000

              return (
                <div
                  key={msg.id}
                  className={`message-row ${isMe ? 'mine' : 'theirs'} ${isGrouped ? 'grouped' : ''}`}
                >
                  {!isMe && !isGrouped && (
                    <div className="msg-avatar" style={{ color: msg.color }}>
                      {msg.avatar}
                    </div>
                  )}
                  {!isMe && isGrouped && <div className="msg-avatar-spacer" />}

                  <div className="message-wrapper">
                    {!isGrouped && !isMe && (
                      <span className="msg-sender" style={{ color: msg.color }}>{msg.username}</span>
                    )}
                    <div
                      className="bubble"
                      style={isMe ? { '--bubble-color': user.color } : { '--bubble-color': msg.color }}
                      onDoubleClick={() => setReactionMenu(msg.id)}
                    >
                      {msg.file ? (
                        <div className="file-message">
                          {msg.file.type.startsWith('image/') ? (
                            <img
                              src={msg.file.data}
                              alt={msg.file.name}
                              className="message-image"
                              onClick={() => window.open(msg.file.data, '_blank')}
                            />
                          ) : (
                            <video
                              src={msg.file.data}
                              controls
                              className="message-video"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <div className="file-info">
                            <span className="file-name">{msg.file.name}</span>
                            <span className="file-size">({(msg.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                          </div>
                        </div>
                      ) : (
                        <span className="bubble-text">{msg.text}</span>
                      )}
                      <span className="bubble-time">{formatTime(msg.timestamp)}</span>
                    </div>

                    {msg.reaction && (
                      <div className="reaction-badge" onClick={() => sendReaction(msg.id, null)}>
                        {msg.reaction}
                      </div>
                    )}

                    {reactionMenu === msg.id && (
                      <div
                        className="reaction-menu"
                        onClick={e => e.stopPropagation()}
                      >
                        {REACTIONS.map(r => (
                          <button key={r} onClick={() => sendReaction(msg.id, r)}>{r}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {typing.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="chat-input-area">
        <form onSubmit={sendMessage} className="input-form">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="file-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Share Photo/Video"
          >
            📎
          </button>
          <button
            type="button"
            className="emoji-toggle-btn"
            onClick={(e) => { e.preventDefault(); setShowEmojiPicker((v) => !v) }}
            title="Insert Emoji"
          >
            😀
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              {EMOJI_PICKER.map((emoji) => (
                <button key={emoji} type="button" onClick={() => addEmoji(emoji)}>{emoji}</button>
              ))}
            </div>
          )}
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Write something sweet..."
            rows={1}
            className="chat-input"
          />
          <button
            type="submit"
            className="send-btn"
            disabled={(!inputText.trim() && !selectedFile) || !connected}
            style={{ '--btn-color': user.color }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </footer>
    </div>
  )
}
