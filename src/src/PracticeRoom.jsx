import { useEffect, useState } from 'react';

export default function PracticeRoom({ apiGet, apiPost, userName, runApi }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [topic, setTopic] = useState('Behavioral Mock Practice');

  const loadRooms = () => {
    apiGet('/api/interview/practice-rooms').then(setRooms).catch(() => setRooms([]));
  };

  useEffect(() => { loadRooms(); }, []);

  const create = async () => {
    const room = await runApi(() => apiPost('/api/interview/practice-rooms/create', { topic }));
    if (room) { setActiveRoom(room); loadRooms(); }
  };

  const join = async () => {
    const room = await runApi(() => apiPost('/api/interview/practice-rooms/join', { code: joinCode, name: userName }));
    if (room) setActiveRoom(room);
  };

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() || !activeRoom) return;
    const room = await apiPost(`/api/interview/practice-rooms/${activeRoom.code}/message`, { text: message });
    setActiveRoom(room);
    setMessage('');
  };

  return (
    <section className="card practice-room-card">
      <div className="section-title"><h2>Peer Practice Rooms</h2><span className="pill">Community</span></div>
      <p className="hint">Create or join a room to practice with peers asynchronously.</p>
      {!activeRoom ? (
        <>
          <input placeholder="Room topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <button onClick={create}>Create Room</button>
          <div className="join-row">
            <input placeholder="Enter room code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
            <button className="btn-outline" onClick={join}>Join Room</button>
          </div>
          <div className="room-list">
            {rooms.map((r) => (
              <div key={r.code} className="room-list-item" onClick={() => setJoinCode(r.code)}>
                <strong>{r.topic}</strong>
                <span>{r.code} · {r.participantCount} peers</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="active-room animate-in">
          <div className="room-header">
            <strong>{activeRoom.topic}</strong>
            <span className="room-code">Code: {activeRoom.code}</span>
            <button className="btn-ghost btn-small" onClick={() => setActiveRoom(null)}>Leave</button>
          </div>
          <div className="room-messages">
            {activeRoom.messages?.map((m, i) => (
              <div key={i} className={`room-msg ${m.sender}`}>
                <strong>{m.sender}</strong>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form className="chat-form" onSubmit={send}>
            <input placeholder="Share a question or feedback..." value={message} onChange={(e) => setMessage(e.target.value)} />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </section>
  );
}
