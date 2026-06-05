import { Server as HTTPServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import { verifyToken } from "./auth.service";
import CollaborativeNote from "../models/collaborative-note.model";
import NoteVersion from "../models/note-version.model";

const docs = new Map<string, Y.Doc>();
const saveTimers = new Map<string, NodeJS.Timeout>();
const lastVersionTime = new Map<string, number>();
const lastEditorId = new Map<string, number>();

const SAVE_DEBOUNCE_MS = 2000;
const VERSION_INTERVAL_MS = 5 * 60 * 1000;

function getYDoc(docName: string): Y.Doc {
  if (docs.has(docName)) {
    return docs.get(docName)!;
  }
  const doc = new Y.Doc();
  docs.set(docName, doc);
  return doc;
}

function getNoteIdFromDocName(docName: string): number | null {
  const match = docName.match(/^note_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

async function loadDocFromDB(docName: string, doc: Y.Doc): Promise<void> {
  const noteId = getNoteIdFromDocName(docName);
  if (!noteId) return;

  const note = await CollaborativeNote.findByPk(noteId);
  if (note && note.content_yjs) {
    const update = new Uint8Array(note.content_yjs);
    Y.applyUpdate(doc, update);
  }
}

function scheduleSave(docName: string, doc: Y.Doc): void {
  if (saveTimers.has(docName)) {
    clearTimeout(saveTimers.get(docName)!);
  }

  const timer = setTimeout(async () => {
    saveTimers.delete(docName);
    await persistDoc(docName, doc);
  }, SAVE_DEBOUNCE_MS);

  saveTimers.set(docName, timer);
}

async function persistDoc(docName: string, doc: Y.Doc): Promise<void> {
  const noteId = getNoteIdFromDocName(docName);
  if (!noteId) return;

  try {
    const stateUpdate = Y.encodeStateAsUpdate(doc);
    const xmlFragment = doc.getXmlFragment("default");
    const html = xmlFragmentToHtml(xmlFragment);

    await CollaborativeNote.update(
      {
        content_yjs: Buffer.from(stateUpdate),
        content_html: html,
      },
      { where: { id: noteId } }
    );

    // Auto-version: create a snapshot if enough time has passed
    const now = Date.now();
    const lastTime = lastVersionTime.get(docName) || 0;
    if (now - lastTime > VERSION_INTERVAL_MS) {
      await createVersionSnapshot(noteId, docName, Buffer.from(stateUpdate), html);
    }
  } catch (error) {
    console.error(`[Yjs] Failed to persist doc ${docName}:`, error);
  }
}

async function createVersionSnapshot(
  noteId: number,
  docName: string,
  yjsBuffer: Buffer,
  html: string
): Promise<void> {
  try {
    const creatorId = lastEditorId.get(docName) || 0;
    const maxResult = await NoteVersion.findOne({
      where: { note_id: noteId },
      order: [["version_number", "DESC"]],
      attributes: ["version_number"],
    });
    const nextVersion = (maxResult?.version_number || 0) + 1;

    await NoteVersion.create({
      note_id: noteId,
      version_number: nextVersion,
      content_html: html,
      content_yjs: yjsBuffer,
      creator_id: creatorId,
    });

    lastVersionTime.set(docName, Date.now());
  } catch (error) {
    console.error(`[Yjs] Failed to create version for ${docName}:`, error);
  }
}

export function getLiveDoc(docName: string): Y.Doc | null {
  return docs.get(docName) || null;
}

export function getDocClients(docName: string): Set<ClientInfo> | null {
  return docClients.get(docName) || null;
}

export async function forceCreateVersion(noteId: number, creatorId: number): Promise<void> {
  const docName = `note_${noteId}`;
  const note = await CollaborativeNote.findByPk(noteId);
  if (!note) return;

  const html = note.content_html || "";
  const yjsBuffer = note.content_yjs || Buffer.alloc(0);

  const maxResult = await NoteVersion.findOne({
    where: { note_id: noteId },
    order: [["version_number", "DESC"]],
    attributes: ["version_number"],
  });
  const nextVersion = (maxResult?.version_number || 0) + 1;

  await NoteVersion.create({
    note_id: noteId,
    version_number: nextVersion,
    content_html: html,
    content_yjs: yjsBuffer,
    creator_id: creatorId,
  });

  lastVersionTime.set(docName, Date.now());
}

function xmlFragmentToHtml(fragment: Y.XmlFragment): string {
  let html = "";
  fragment.toArray().forEach((item) => {
    if (item instanceof Y.XmlElement) {
      html += xmlElementToHtml(item);
    } else if (item instanceof Y.XmlText) {
      html += item.toJSON();
    }
  });
  return html;
}

function xmlElementToHtml(element: Y.XmlElement): string {
  const tag = element.nodeName;
  const attrs = element.getAttributes();
  let attrStr = "";
  for (const [key, value] of Object.entries(attrs)) {
    attrStr += ` ${key}="${value}"`;
  }

  let innerHTML = "";
  element.toArray().forEach((child) => {
    if (child instanceof Y.XmlElement) {
      innerHTML += xmlElementToHtml(child);
    } else if (child instanceof Y.XmlText) {
      innerHTML += child.toJSON();
    }
  });

  if (tag === "void") return innerHTML;
  return `<${tag}${attrStr}>${innerHTML}</${tag}>`;
}

// Yjs sync protocol encoding helpers
const messageSync = 0;
const messageAwareness = 1;

function writeVarUint(encoder: number[], num: number) {
  while (num > 0x7f) {
    encoder.push(0x80 | (num & 0x7f));
    num >>>= 7;
  }
  encoder.push(num & 0x7f);
}

function readVarUint(decoder: { data: Uint8Array; pos: number }): number {
  let num = 0;
  let mult = 1;
  const len = decoder.data.length;
  while (decoder.pos < len) {
    const r = decoder.data[decoder.pos++];
    num = num + (r & 0x7f) * mult;
    mult *= 128;
    if (r < 0x80) return num;
  }
  return num;
}

function readVarUint8Array(decoder: { data: Uint8Array; pos: number }): Uint8Array {
  const len = readVarUint(decoder);
  const arr = decoder.data.slice(decoder.pos, decoder.pos + len);
  decoder.pos += len;
  return arr;
}

export interface ClientInfo {
  ws: WebSocket;
  userId: number;
  username: string;
}

const docClients = new Map<string, Set<ClientInfo>>();

// Awareness protocol
const awarenessStates = new Map<string, Map<number, { clock: number; state: any }>>();

function getAwarenessStates(docName: string) {
  if (!awarenessStates.has(docName)) {
    awarenessStates.set(docName, new Map());
  }
  return awarenessStates.get(docName)!;
}

function encodeAwarenessUpdate(states: Map<number, { clock: number; state: any }>, clientIds: number[]): Uint8Array {
  const encoder: number[] = [];
  writeVarUint(encoder, clientIds.length);
  for (const clientId of clientIds) {
    const state = states.get(clientId);
    writeVarUint(encoder, clientId);
    writeVarUint(encoder, state?.clock || 0);
    const json = JSON.stringify(state?.state || null);
    const jsonBytes = new TextEncoder().encode(json);
    writeVarUint(encoder, jsonBytes.length);
    encoder.push(...jsonBytes);
  }
  return new Uint8Array(encoder);
}

export function initYjsWebSocket(httpServer: HTTPServer): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname !== "/yjs") return;

    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const room = url.searchParams.get("room");
    if (!room) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      handleConnection(ws, room, decoded.id, decoded.username);
    });
  });

  console.log("🔌 Yjs WebSocket server initialized on /yjs path");
}

async function handleConnection(
  ws: WebSocket,
  docName: string,
  userId: number,
  username: string
): Promise<void> {
  const doc = getYDoc(docName);
  const clientInfo: ClientInfo = { ws, userId, username };

  if (!docClients.has(docName)) {
    docClients.set(docName, new Set());
    await loadDocFromDB(docName, doc);
  }

  const clients = docClients.get(docName)!;
  clients.add(clientInfo);

  doc.on("update", (update: Uint8Array, origin: any) => {
    if (origin === clientInfo) return;
    scheduleSave(docName, doc);
  });

  // Send initial sync step 1: full state vector
  const sv = Y.encodeStateVector(doc);
  const syncStep1: number[] = [];
  syncStep1.push(messageSync);
  // sync step 1 message type = 0
  writeVarUint(syncStep1, 0);
  writeVarUint(syncStep1, sv.length);
  syncStep1.push(...sv);
  ws.send(new Uint8Array(syncStep1));

  // Send existing awareness states
  const awareness = getAwarenessStates(docName);
  if (awareness.size > 0) {
    const awarenessUpdate = encodeAwarenessUpdate(awareness, [...awareness.keys()]);
    const msg: number[] = [];
    msg.push(messageAwareness);
    writeVarUint(msg, awarenessUpdate.length);
    msg.push(...awarenessUpdate);
    ws.send(new Uint8Array(msg));
  }

  ws.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
    let message: Uint8Array;
    if (Buffer.isBuffer(data)) {
      message = new Uint8Array(data);
    } else if (data instanceof ArrayBuffer) {
      message = new Uint8Array(data);
    } else {
      message = new Uint8Array(Buffer.concat(data as Uint8Array[]));
    }

    if (message.length === 0) return;

    const decoder = { data: message, pos: 0 };
    const msgType = readVarUint(decoder);

    if (msgType === messageSync) {
      handleSyncMessage(decoder, doc, ws, clientInfo, docName);
    } else if (msgType === messageAwareness) {
      handleAwarenessMessage(decoder, docName, clientInfo);
    }
  });

  ws.on("close", () => {
    clients.delete(clientInfo);

    // Remove awareness state for this client
    const awareness = getAwarenessStates(docName);
    awareness.delete(userId);

    // Broadcast awareness removal
    const removalUpdate = encodeAwarenessUpdate(
      new Map([[userId, { clock: 0, state: null }]]),
      [userId]
    );
    const msg: number[] = [];
    msg.push(messageAwareness);
    writeVarUint(msg, removalUpdate.length);
    msg.push(...removalUpdate);
    const broadcastMsg = new Uint8Array(msg);
    clients.forEach((c) => {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(broadcastMsg);
      }
    });

    if (clients.size === 0) {
      // Final save and cleanup
      persistDoc(docName, doc);
      if (saveTimers.has(docName)) {
        clearTimeout(saveTimers.get(docName)!);
        saveTimers.delete(docName);
      }
      docs.delete(docName);
      docClients.delete(docName);
      awarenessStates.delete(docName);
    }
  });
}

function handleSyncMessage(
  decoder: { data: Uint8Array; pos: number },
  doc: Y.Doc,
  ws: WebSocket,
  origin: ClientInfo,
  docName: string
): void {
  const syncMessageType = readVarUint(decoder);

  if (syncMessageType === 0) {
    // Sync step 1: client sends state vector, server responds with missing updates
    const stateVector = readVarUint8Array(decoder);
    const update = Y.encodeStateAsUpdate(doc, stateVector);
    const response: number[] = [];
    response.push(messageSync);
    // sync step 2 message type = 1
    writeVarUint(response, 1);
    writeVarUint(response, update.length);
    response.push(...update);
    ws.send(new Uint8Array(response));
  } else if (syncMessageType === 1) {
    // Sync step 2: client sends update
    const update = readVarUint8Array(decoder);
    Y.applyUpdate(doc, update, origin);
    lastEditorId.set(docName, origin.userId);
    scheduleSave(docName, doc);
    // Broadcast to other clients
    broadcastUpdate(docName, update, origin);
  } else if (syncMessageType === 2) {
    // Update message
    const update = readVarUint8Array(decoder);
    Y.applyUpdate(doc, update, origin);
    lastEditorId.set(docName, origin.userId);
    scheduleSave(docName, doc);
    broadcastUpdate(docName, update, origin);
  }
}

export function broadcastUpdate(docName: string, update: Uint8Array, origin: ClientInfo): void {
  const clients = docClients.get(docName);
  if (!clients) return;

  const msg: number[] = [];
  msg.push(messageSync);
  writeVarUint(msg, 2); // update message type
  writeVarUint(msg, update.length);
  msg.push(...update);
  const broadcastMsg = new Uint8Array(msg);

  clients.forEach((client) => {
    if (client !== origin && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(broadcastMsg);
    }
  });
}

function handleAwarenessMessage(
  decoder: { data: Uint8Array; pos: number },
  docName: string,
  origin: ClientInfo
): void {
  const awarenessData = readVarUint8Array(decoder);
  const awareness = getAwarenessStates(docName);

  // Parse awareness update
  const awarenessDecoder = { data: awarenessData, pos: 0 };
  const len = readVarUint(awarenessDecoder);
  const changedClients: number[] = [];

  for (let i = 0; i < len; i++) {
    const clientId = readVarUint(awarenessDecoder);
    const clock = readVarUint(awarenessDecoder);
    const stateBytes = readVarUint8Array(awarenessDecoder);
    const stateJson = new TextDecoder().decode(stateBytes);
    const state = JSON.parse(stateJson);

    awareness.set(clientId, { clock, state });
    changedClients.push(clientId);
  }

  // Broadcast awareness to all other clients
  const clients = docClients.get(docName);
  if (!clients) return;

  const msg: number[] = [];
  msg.push(messageAwareness);
  writeVarUint(msg, awarenessData.length);
  msg.push(...awarenessData);
  const broadcastMsg = new Uint8Array(msg);

  clients.forEach((client) => {
    if (client !== origin && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(broadcastMsg);
    }
  });
}
