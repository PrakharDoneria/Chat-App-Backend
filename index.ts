import { serve } from "https://deno.land/std@0.202.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { v4 as uuidv4 } from "npm:uuid@9.0.0";

const kv = await Deno.openKv();

async function handleSignup(req: Request) {
  const { username, email, password } = await req.json();
  const existingUsername = await kv.get(["users", "username", username]);
  const existingEmail = await kv.get(["users", "email", email]);

  if (existingUsername.value || existingEmail.value) {
    return new Response(JSON.stringify({ error: "User or email already exists" }), { status: 409 });
  }

  const userId = uuidv4();
  const user = { userId, username, email, password };

  await kv.set(["users", "id", userId], user);
  await kv.set(["users", "username", username], user);
  await kv.set(["users", "email", email], user);

  return new Response(JSON.stringify({ message: "User registered successfully", userId }), { status: 201 });
}

async function handleLogin(req: Request) {
  const { username, email, password } = await req.json();
  let user;

  if (username) {
    user = await kv.get(["users", "username", username]);
  } else if (email) {
    user = await kv.get(["users", "email", email]);
  }

  if (!user?.value || user.value.password !== password) {
    return new Response(JSON.stringify({ error: "Invalid username/email or password" }), { status: 401 });
  }

  return new Response(JSON.stringify({ message: "Login successful", userId: user.value.userId }), { status: 200 });
}

async function handleSendMessage(req: Request) {
  const { userId, recipientUsername, groupName, message } = await req.json();
  const timestamp = new Date().toISOString();
  let key, value;

  if (groupName) {
    key = ["messages", "groups", groupName, timestamp];
    value = { from: userId, message, timestamp };
  } else {
    const recipient = await kv.get(["users", "username", recipientUsername]);
    if (!recipient?.value) {
      return new Response(JSON.stringify({ error: "Recipient not found" }), { status: 404 });
    }
    const recipientId = recipient.value.userId;
    key = ["messages", "users", userId, recipientId, timestamp];
    value = { from: userId, to: recipientId, message, timestamp };
  }

  const messages = [];
  for await (const entry of kv.list({ prefix: key.slice(0, -1) })) {
    messages.push(entry.key);
  }
  if (messages.length >= 25) {
    await kv.delete(messages[0]);
  }

  await kv.set(key, value);

  return new Response(JSON.stringify({ message: "Message sent successfully" }), { status: 200 });
}

async function handleGetMessages(req: Request) {
  const url = new URL(req.url);
  const groupName = url.searchParams.get("groupName");
  const userId = url.searchParams.get("userId");
  const recipientId = url.searchParams.get("recipientId");

  const messages = [];
  let prefix;

  if (groupName) {
    prefix = ["messages", "groups", groupName];
  } else if (userId && recipientId) {
    prefix = ["messages", "users", userId, recipientId];
  } else {
    return new Response(JSON.stringify({ error: "Invalid query parameters" }), { status: 400 });
  }

  for await (const entry of kv.list({ prefix })) {
    messages.push(entry.value);
  }

  return new Response(JSON.stringify(messages), { status: 200 });
}

async function handleCreateGroup(req: Request) {
  const { groupName, members } = await req.json();
  const existingGroup = await kv.get(["groups", groupName]);

  if (existingGroup.value) {
    return new Response(JSON.stringify({ error: "Group already exists" }), { status: 409 });
  }

  await kv.set(["groups", groupName], { groupName, members });

  return new Response(JSON.stringify({ message: "Group created successfully" }), { status: 201 });
}

async function handleDeleteGroup(req: Request) {
  const { groupName } = await req.json();
  const group = await kv.get(["groups", groupName]);

  if (!group.value) {
    return new Response(JSON.stringify({ error: "Group not found" }), { status: 404 });
  }

  for await (const entry of kv.list({ prefix: ["messages", "groups", groupName] })) {
    await kv.delete(entry.key);
  }

  await kv.delete(["groups", groupName]);

  return new Response(JSON.stringify({ message: "Group deleted successfully" }), { status: 200 });
}

async function handleDelete(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "accounts") {
    for await (const entry of kv.list({ prefix: ["users"] })) {
      await kv.delete(entry.key);
    }
    return new Response(JSON.stringify({ message: "All accounts deleted successfully" }), { status: 200 });
  } else if (type === "msgs") {
    for await (const entry of kv.list({ prefix: ["messages"] })) {
      await kv.delete(entry.key);
    }
    return new Response(JSON.stringify({ message: "All messages deleted successfully" }), { status: 200 });
  } else {
    return new Response(JSON.stringify({ error: "Invalid type parameter" }), { status: 400 });
  }
}

async function handleRemove(req: Request) {
  const { username, email, password } = await req.json();
  let user;

  if (username) {
    user = await kv.get(["users", "username", username]);
  } else if (email) {
    user = await kv.get(["users", "email", email]);
  }

  if (!user?.value || user.value.password !== password) {
    return new Response(JSON.stringify({ error: "Invalid username/email or password" }), { status: 401 });
  }

  for await (const entry of kv.list({ prefix: ["messages"] })) {
    if (entry.value.from === user.value.userId) {
      await kv.delete(entry.key);
    }
  }

  await kv.delete(["users", "id", user.value.userId]);
  await kv.delete(["users", "username", user.value.username]);
  await kv.delete(["users", "email", user.value.email]);

  return new Response(JSON.stringify({ message: "User and all related data removed successfully" }), { status: 200 });
}

async function handleGetUsersMessaged(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return new Response(JSON.stringify({ error: "Username parameter is required" }), { status: 400 });
  }

  const messagedUsers = new Map<string, { message: string, timestamp: string }>();

  for await (const entry of kv.list({ prefix: ["messages", "users", username] })) {
    const [_, recipientId, timestamp] = entry.key;
    const message = entry.value;

    if (!messagedUsers.has(recipientId) || message.timestamp > messagedUsers.get(recipientId)!.timestamp) {
      messagedUsers.set(recipientId, { message: message.message, timestamp: message.timestamp });
    }
  }

  const response = [];
  for (const [recipientId, lastMessage] of messagedUsers.entries()) {
    const recipient = await kv.get(["users", "id", recipientId]);
    response.push({
      uid: recipient.value?.username || recipientId,
      lastMessage: lastMessage.message,
      timestamp: lastMessage.timestamp
    });
  }

  return new Response(JSON.stringify(response), { status: 200 });
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/signup") {
    return await handleSignup(req);
  } else if (req.method === "POST" && url.pathname === "/login") {
    return await handleLogin(req);
  } else if (req.method === "POST" && url.pathname === "/send-message") {
    return await handleSendMessage(req);
  } else if (req.method === "GET" && url.pathname === "/messages") {
    return await handleGetMessages(req);
  } else if (req.method === "POST" && url.pathname === "/create-group") {
    return await handleCreateGroup(req);
  } else if (req.method === "POST" && url.pathname === "/delete-group") {
    return await handleDeleteGroup(req);
  } else if (req.method === "GET" && url.pathname === "/delete") {
    return await handleDelete(req);
  } else if (req.method === "POST" && url.pathname === "/remove") {
    return await handleRemove(req);
  } else if (req.method === "GET" && url.pathname === "/users-messaged") {
    return await handleGetUsersMessaged(req);
  }

  return new Response("Not Found", { status: 404 });
}, { port: 8000 });
