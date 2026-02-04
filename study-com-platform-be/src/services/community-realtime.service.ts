import type { Response } from "express";

type Client = {
  id: string;
  userId: number;
  res: Response;
};

const clients = new Map<string, Client>();

const writeEvent = (res: Response, event: string, data: unknown) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const addCommunityClient = (client: Client) => {
  clients.set(client.id, client);
  broadcastOnlineCount();
};

export const removeCommunityClient = (clientId: string) => {
  if (clients.has(clientId)) {
    clients.delete(clientId);
    broadcastOnlineCount();
  }
};

export const broadcastOnlineCount = () => {
  const count = clients.size;
  clients.forEach((client) => {
    writeEvent(client.res, "online", { count });
  });
};

export const broadcastNewPost = (payload: {
  postId: number;
  title: string;
  authorUsername?: string;
  authorNickname?: string;
  createdAt?: string;
}) => {
  clients.forEach((client) => {
    writeEvent(client.res, "new_post", payload);
  });
};
