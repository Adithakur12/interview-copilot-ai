const { v4: uuidv4 } = require('uuid');

const rooms = new Map();

function createRoom(hostName, topic = 'Mock Interview Practice') {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const room = {
    id: uuidv4(),
    code,
    topic,
    hostName,
    participants: [{ name: hostName, joinedAt: new Date().toISOString() }],
    messages: [{ sender: 'system', text: `${hostName} created the practice room.`, time: new Date().toISOString() }],
    createdAt: new Date().toISOString()
  };
  rooms.set(code, room);
  return room;
}

function joinRoom(code, participantName) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  if (!room.participants.find((p) => p.name === participantName)) {
    room.participants.push({ name: participantName, joinedAt: new Date().toISOString() });
    room.messages.push({ sender: 'system', text: `${participantName} joined the room.`, time: new Date().toISOString() });
  }
  return room;
}

function getRoom(code) {
  return rooms.get(code.toUpperCase()) || null;
}

function postMessage(code, sender, text) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  room.messages.push({ sender, text, time: new Date().toISOString() });
  if (room.messages.length > 50) room.messages = room.messages.slice(-50);
  return room;
}

function listPublicRooms() {
  return Array.from(rooms.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((r) => ({ code: r.code, topic: r.topic, hostName: r.hostName, participantCount: r.participants.length }));
}

module.exports = { createRoom, joinRoom, getRoom, postMessage, listPublicRooms };
