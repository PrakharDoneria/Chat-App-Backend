import { serve } from "https://deno.land/std@0.202.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { v4 as uuidv4 } from "npm:uuid@9.0.0";
const kv = await Deno.openKv();
async function handleSignup(req) {
  const { username, email, password } = await req.json();
  const existingUsername = await kv.get([
    "users",
    "username",
    username
  ]);
  const existingEmail = await kv.get([
    "users",
    "email",
    email
  ]);
  if (existingUsername.value || existingEmail.value) {
    return new Response(JSON.stringify({
      error: "User or email already exists"
    }), {
      status: 409
    });
  }
  const userId = uuidv4();
  const user = {
    userId,
    username,
    email,
    password
  };
  await kv.set([
    "users",
    "id",
    userId
  ], user);
  await kv.set([
    "users",
    "username",
    username
  ], user);
  await kv.set([
    "users",
    "email",
    email
  ], user);
  return new Response(JSON.stringify({
    message: "User registered successfully",
    userId
  }), {
    status: 201
  });
}
async function handleLogin(req) {
  const { username, email, password } = await req.json();
  let user;
  if (username) {
    user = await kv.get([
      "users",
      "username",
      username
    ]);
  } else if (email) {
    user = await kv.get([
      "users",
      "email",
      email
    ]);
  }
  if (!user?.value || user.value.password !== password) {
    return new Response(JSON.stringify({
      error: "Invalid username/email or password"
    }), {
      status: 401
    });
  }
  return new Response(JSON.stringify({
    message: "Login successful",
    userId: user.value.userId
  }), {
    status: 200
  });
}
async function handleSendMessage(req) {
  const { userId, recipientUsername, groupName, message } = await req.json();
  const timestamp = new Date().toISOString();
  let key, value;
  if (groupName) {
    key = [
      "messages",
      "groups",
      groupName,
      timestamp
    ];
    value = {
      from: userId,
      message,
      timestamp
    };
  } else {
    const recipient = await kv.get([
      "users",
      "username",
      recipientUsername
    ]);
    if (!recipient?.value) {
      return new Response(JSON.stringify({
        error: "Recipient not found"
      }), {
        status: 404
      });
    }
    const recipientId = recipient.value.userId;
    key = [
      "messages",
      "users",
      userId,
      recipientId,
      timestamp
    ];
    value = {
      from: userId,
      to: recipientId,
      message,
      timestamp
    };
  }
  const messages = [];
  for await (const entry of kv.list({
    prefix: key.slice(0, -1)
  })){
    messages.push(entry.key);
  }
  if (messages.length >= 25) {
    await kv.delete(messages[0]);
  }
  await kv.set(key, value);
  return new Response(JSON.stringify({
    message: "Message sent successfully"
  }), {
    status: 200
  });
}
async function handleGetMessages(req) {
  const url = new URL(req.url);
  const groupName = url.searchParams.get("groupName");
  const userId = url.searchParams.get("userId");
  const recipientId = url.searchParams.get("recipientId");
  const messages = [];
  let prefix;
  if (groupName) {
    prefix = [
      "messages",
      "groups",
      groupName
    ];
  } else if (userId && recipientId) {
    prefix = [
      "messages",
      "users",
      userId,
      recipientId
    ];
  } else {
    return new Response(JSON.stringify({
      error: "Invalid query parameters"
    }), {
      status: 400
    });
  }
  for await (const entry of kv.list({
    prefix
  })){
    messages.push(entry.value);
  }
  return new Response(JSON.stringify(messages), {
    status: 200
  });
}
async function handleCreateGroup(req) {
  const { groupName, members } = await req.json();
  const existingGroup = await kv.get([
    "groups",
    groupName
  ]);
  if (existingGroup.value) {
    return new Response(JSON.stringify({
      error: "Group already exists"
    }), {
      status: 409
    });
  }
  await kv.set([
    "groups",
    groupName
  ], {
    groupName,
    members
  });
  return new Response(JSON.stringify({
    message: "Group created successfully"
  }), {
    status: 201
  });
}
async function handleDeleteGroup(req) {
  const { groupName } = await req.json();
  const group = await kv.get([
    "groups",
    groupName
  ]);
  if (!group.value) {
    return new Response(JSON.stringify({
      error: "Group not found"
    }), {
      status: 404
    });
  }
  for await (const entry of kv.list({
    prefix: [
      "messages",
      "groups",
      groupName
    ]
  })){
    await kv.delete(entry.key);
  }
  await kv.delete([
    "groups",
    groupName
  ]);
  return new Response(JSON.stringify({
    message: "Group deleted successfully"
  }), {
    status: 200
  });
}
async function handleDelete(req) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  if (type === "accounts") {
    for await (const entry of kv.list({
      prefix: [
        "users"
      ]
    })){
      await kv.delete(entry.key);
    }
    return new Response(JSON.stringify({
      message: "All accounts deleted successfully"
    }), {
      status: 200
    });
  } else if (type === "msgs") {
    for await (const entry of kv.list({
      prefix: [
        "messages"
      ]
    })){
      await kv.delete(entry.key);
    }
    return new Response(JSON.stringify({
      message: "All messages deleted successfully"
    }), {
      status: 200
    });
  } else {
    return new Response(JSON.stringify({
      error: "Invalid type parameter"
    }), {
      status: 400
    });
  }
}
async function handleRemove(req) {
  const { username, email, password } = await req.json();
  let user;
  if (username) {
    user = await kv.get([
      "users",
      "username",
      username
    ]);
  } else if (email) {
    user = await kv.get([
      "users",
      "email",
      email
    ]);
  }
  if (!user?.value || user.value.password !== password) {
    return new Response(JSON.stringify({
      error: "Invalid username/email or password"
    }), {
      status: 401
    });
  }
  for await (const entry of kv.list({
    prefix: [
      "messages"
    ]
  })){
    if (entry.value.from === user.value.userId) {
      await kv.delete(entry.key);
    }
  }
  await kv.delete([
    "users",
    "id",
    user.value.userId
  ]);
  await kv.delete([
    "users",
    "username",
    user.value.username
  ]);
  await kv.delete([
    "users",
    "email",
    user.value.email
  ]);
  return new Response(JSON.stringify({
    message: "User and all related data removed successfully"
  }), {
    status: 200
  });
}
serve(async (req)=>{
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
  }
  return new Response("Not Found", {
    status: 404
  });
}, {
  port: 8000
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvQ2hhdC1BcHAtQmFja2VuZC9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzZXJ2ZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAMC4yMDIuMC9odHRwL3NlcnZlci50c1wiO1xuaW1wb3J0IFwiaHR0cHM6Ly9kZW5vLmxhbmQveC9kb3RlbnZAdjMuMi4yL2xvYWQudHNcIjtcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gXCJucG06dXVpZEA5LjAuMFwiO1xuXG5jb25zdCBrdiA9IGF3YWl0IERlbm8ub3Blbkt2KCk7XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVNpZ251cChyZXE6IFJlcXVlc3QpIHtcbiAgY29uc3QgeyB1c2VybmFtZSwgZW1haWwsIHBhc3N3b3JkIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICBjb25zdCBleGlzdGluZ1VzZXJuYW1lID0gYXdhaXQga3YuZ2V0KFtcInVzZXJzXCIsIFwidXNlcm5hbWVcIiwgdXNlcm5hbWVdKTtcbiAgY29uc3QgZXhpc3RpbmdFbWFpbCA9IGF3YWl0IGt2LmdldChbXCJ1c2Vyc1wiLCBcImVtYWlsXCIsIGVtYWlsXSk7XG5cbiAgaWYgKGV4aXN0aW5nVXNlcm5hbWUudmFsdWUgfHwgZXhpc3RpbmdFbWFpbC52YWx1ZSkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJVc2VyIG9yIGVtYWlsIGFscmVhZHkgZXhpc3RzXCIgfSksIHsgc3RhdHVzOiA0MDkgfSk7XG4gIH1cblxuICBjb25zdCB1c2VySWQgPSB1dWlkdjQoKTtcbiAgY29uc3QgdXNlciA9IHsgdXNlcklkLCB1c2VybmFtZSwgZW1haWwsIHBhc3N3b3JkIH07XG5cbiAgYXdhaXQga3Yuc2V0KFtcInVzZXJzXCIsIFwiaWRcIiwgdXNlcklkXSwgdXNlcik7XG4gIGF3YWl0IGt2LnNldChbXCJ1c2Vyc1wiLCBcInVzZXJuYW1lXCIsIHVzZXJuYW1lXSwgdXNlcik7XG4gIGF3YWl0IGt2LnNldChbXCJ1c2Vyc1wiLCBcImVtYWlsXCIsIGVtYWlsXSwgdXNlcik7XG5cbiAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6IFwiVXNlciByZWdpc3RlcmVkIHN1Y2Nlc3NmdWxseVwiLCB1c2VySWQgfSksIHsgc3RhdHVzOiAyMDEgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUxvZ2luKHJlcTogUmVxdWVzdCkge1xuICBjb25zdCB7IHVzZXJuYW1lLCBlbWFpbCwgcGFzc3dvcmQgfSA9IGF3YWl0IHJlcS5qc29uKCk7XG4gIGxldCB1c2VyO1xuXG4gIGlmICh1c2VybmFtZSkge1xuICAgIHVzZXIgPSBhd2FpdCBrdi5nZXQoW1widXNlcnNcIiwgXCJ1c2VybmFtZVwiLCB1c2VybmFtZV0pO1xuICB9IGVsc2UgaWYgKGVtYWlsKSB7XG4gICAgdXNlciA9IGF3YWl0IGt2LmdldChbXCJ1c2Vyc1wiLCBcImVtYWlsXCIsIGVtYWlsXSk7XG4gIH1cblxuICBpZiAoIXVzZXI/LnZhbHVlIHx8IHVzZXIudmFsdWUucGFzc3dvcmQgIT09IHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludmFsaWQgdXNlcm5hbWUvZW1haWwgb3IgcGFzc3dvcmRcIiB9KSwgeyBzdGF0dXM6IDQwMSB9KTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiBcIkxvZ2luIHN1Y2Nlc3NmdWxcIiwgdXNlcklkOiB1c2VyLnZhbHVlLnVzZXJJZCB9KSwgeyBzdGF0dXM6IDIwMCB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlU2VuZE1lc3NhZ2UocmVxOiBSZXF1ZXN0KSB7XG4gIGNvbnN0IHsgdXNlcklkLCByZWNpcGllbnRVc2VybmFtZSwgZ3JvdXBOYW1lLCBtZXNzYWdlIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIGxldCBrZXksIHZhbHVlO1xuXG4gIGlmIChncm91cE5hbWUpIHtcbiAgICBrZXkgPSBbXCJtZXNzYWdlc1wiLCBcImdyb3Vwc1wiLCBncm91cE5hbWUsIHRpbWVzdGFtcF07XG4gICAgdmFsdWUgPSB7IGZyb206IHVzZXJJZCwgbWVzc2FnZSwgdGltZXN0YW1wIH07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcmVjaXBpZW50ID0gYXdhaXQga3YuZ2V0KFtcInVzZXJzXCIsIFwidXNlcm5hbWVcIiwgcmVjaXBpZW50VXNlcm5hbWVdKTtcbiAgICBpZiAoIXJlY2lwaWVudD8udmFsdWUpIHtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJSZWNpcGllbnQgbm90IGZvdW5kXCIgfSksIHsgc3RhdHVzOiA0MDQgfSk7XG4gICAgfVxuICAgIGNvbnN0IHJlY2lwaWVudElkID0gcmVjaXBpZW50LnZhbHVlLnVzZXJJZDtcbiAgICBrZXkgPSBbXCJtZXNzYWdlc1wiLCBcInVzZXJzXCIsIHVzZXJJZCwgcmVjaXBpZW50SWQsIHRpbWVzdGFtcF07XG4gICAgdmFsdWUgPSB7IGZyb206IHVzZXJJZCwgdG86IHJlY2lwaWVudElkLCBtZXNzYWdlLCB0aW1lc3RhbXAgfTtcbiAgfVxuXG4gIGNvbnN0IG1lc3NhZ2VzID0gW107XG4gIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2Yga3YubGlzdCh7IHByZWZpeDoga2V5LnNsaWNlKDAsIC0xKSB9KSkge1xuICAgIG1lc3NhZ2VzLnB1c2goZW50cnkua2V5KTtcbiAgfVxuICBpZiAobWVzc2FnZXMubGVuZ3RoID49IDI1KSB7XG4gICAgYXdhaXQga3YuZGVsZXRlKG1lc3NhZ2VzWzBdKTtcbiAgfVxuXG4gIGF3YWl0IGt2LnNldChrZXksIHZhbHVlKTtcblxuICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogXCJNZXNzYWdlIHNlbnQgc3VjY2Vzc2Z1bGx5XCIgfSksIHsgc3RhdHVzOiAyMDAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldE1lc3NhZ2VzKHJlcTogUmVxdWVzdCkge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwpO1xuICBjb25zdCBncm91cE5hbWUgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImdyb3VwTmFtZVwiKTtcbiAgY29uc3QgdXNlcklkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJ1c2VySWRcIik7XG4gIGNvbnN0IHJlY2lwaWVudElkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJyZWNpcGllbnRJZFwiKTtcblxuICBjb25zdCBtZXNzYWdlcyA9IFtdO1xuICBsZXQgcHJlZml4O1xuXG4gIGlmIChncm91cE5hbWUpIHtcbiAgICBwcmVmaXggPSBbXCJtZXNzYWdlc1wiLCBcImdyb3Vwc1wiLCBncm91cE5hbWVdO1xuICB9IGVsc2UgaWYgKHVzZXJJZCAmJiByZWNpcGllbnRJZCkge1xuICAgIHByZWZpeCA9IFtcIm1lc3NhZ2VzXCIsIFwidXNlcnNcIiwgdXNlcklkLCByZWNpcGllbnRJZF07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludmFsaWQgcXVlcnkgcGFyYW1ldGVyc1wiIH0pLCB7IHN0YXR1czogNDAwIH0pO1xuICB9XG5cbiAgZm9yIGF3YWl0IChjb25zdCBlbnRyeSBvZiBrdi5saXN0KHsgcHJlZml4IH0pKSB7XG4gICAgbWVzc2FnZXMucHVzaChlbnRyeS52YWx1ZSk7XG4gIH1cblxuICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2VzKSwgeyBzdGF0dXM6IDIwMCB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQ3JlYXRlR3JvdXAocmVxOiBSZXF1ZXN0KSB7XG4gIGNvbnN0IHsgZ3JvdXBOYW1lLCBtZW1iZXJzIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICBjb25zdCBleGlzdGluZ0dyb3VwID0gYXdhaXQga3YuZ2V0KFtcImdyb3Vwc1wiLCBncm91cE5hbWVdKTtcblxuICBpZiAoZXhpc3RpbmdHcm91cC52YWx1ZSkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJHcm91cCBhbHJlYWR5IGV4aXN0c1wiIH0pLCB7IHN0YXR1czogNDA5IH0pO1xuICB9XG5cbiAgYXdhaXQga3Yuc2V0KFtcImdyb3Vwc1wiLCBncm91cE5hbWVdLCB7IGdyb3VwTmFtZSwgbWVtYmVycyB9KTtcblxuICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogXCJHcm91cCBjcmVhdGVkIHN1Y2Nlc3NmdWxseVwiIH0pLCB7IHN0YXR1czogMjAxIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVEZWxldGVHcm91cChyZXE6IFJlcXVlc3QpIHtcbiAgY29uc3QgeyBncm91cE5hbWUgfSA9IGF3YWl0IHJlcS5qc29uKCk7XG4gIGNvbnN0IGdyb3VwID0gYXdhaXQga3YuZ2V0KFtcImdyb3Vwc1wiLCBncm91cE5hbWVdKTtcblxuICBpZiAoIWdyb3VwLnZhbHVlKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkdyb3VwIG5vdCBmb3VuZFwiIH0pLCB7IHN0YXR1czogNDA0IH0pO1xuICB9XG5cbiAgZm9yIGF3YWl0IChjb25zdCBlbnRyeSBvZiBrdi5saXN0KHsgcHJlZml4OiBbXCJtZXNzYWdlc1wiLCBcImdyb3Vwc1wiLCBncm91cE5hbWVdIH0pKSB7XG4gICAgYXdhaXQga3YuZGVsZXRlKGVudHJ5LmtleSk7XG4gIH1cblxuICBhd2FpdCBrdi5kZWxldGUoW1wiZ3JvdXBzXCIsIGdyb3VwTmFtZV0pO1xuXG4gIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiBcIkdyb3VwIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5XCIgfSksIHsgc3RhdHVzOiAyMDAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZURlbGV0ZShyZXE6IFJlcXVlc3QpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsKTtcbiAgY29uc3QgdHlwZSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwidHlwZVwiKTtcblxuICBpZiAodHlwZSA9PT0gXCJhY2NvdW50c1wiKSB7XG4gICAgZm9yIGF3YWl0IChjb25zdCBlbnRyeSBvZiBrdi5saXN0KHsgcHJlZml4OiBbXCJ1c2Vyc1wiXSB9KSkge1xuICAgICAgYXdhaXQga3YuZGVsZXRlKGVudHJ5LmtleSk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiBcIkFsbCBhY2NvdW50cyBkZWxldGVkIHN1Y2Nlc3NmdWxseVwiIH0pLCB7IHN0YXR1czogMjAwIH0pO1xuICB9IGVsc2UgaWYgKHR5cGUgPT09IFwibXNnc1wiKSB7XG4gICAgZm9yIGF3YWl0IChjb25zdCBlbnRyeSBvZiBrdi5saXN0KHsgcHJlZml4OiBbXCJtZXNzYWdlc1wiXSB9KSkge1xuICAgICAgYXdhaXQga3YuZGVsZXRlKGVudHJ5LmtleSk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiBcIkFsbCBtZXNzYWdlcyBkZWxldGVkIHN1Y2Nlc3NmdWxseVwiIH0pLCB7IHN0YXR1czogMjAwIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJJbnZhbGlkIHR5cGUgcGFyYW1ldGVyXCIgfSksIHsgc3RhdHVzOiA0MDAgfSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVtb3ZlKHJlcTogUmVxdWVzdCkge1xuICBjb25zdCB7IHVzZXJuYW1lLCBlbWFpbCwgcGFzc3dvcmQgfSA9IGF3YWl0IHJlcS5qc29uKCk7XG4gIGxldCB1c2VyO1xuXG4gIGlmICh1c2VybmFtZSkge1xuICAgIHVzZXIgPSBhd2FpdCBrdi5nZXQoW1widXNlcnNcIiwgXCJ1c2VybmFtZVwiLCB1c2VybmFtZV0pO1xuICB9IGVsc2UgaWYgKGVtYWlsKSB7XG4gICAgdXNlciA9IGF3YWl0IGt2LmdldChbXCJ1c2Vyc1wiLCBcImVtYWlsXCIsIGVtYWlsXSk7XG4gIH1cblxuICBpZiAoIXVzZXI/LnZhbHVlIHx8IHVzZXIudmFsdWUucGFzc3dvcmQgIT09IHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludmFsaWQgdXNlcm5hbWUvZW1haWwgb3IgcGFzc3dvcmRcIiB9KSwgeyBzdGF0dXM6IDQwMSB9KTtcbiAgfVxuXG4gIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2Yga3YubGlzdCh7IHByZWZpeDogW1wibWVzc2FnZXNcIl0gfSkpIHtcbiAgICBpZiAoZW50cnkudmFsdWUuZnJvbSA9PT0gdXNlci52YWx1ZS51c2VySWQpIHtcbiAgICAgIGF3YWl0IGt2LmRlbGV0ZShlbnRyeS5rZXkpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGt2LmRlbGV0ZShbXCJ1c2Vyc1wiLCBcImlkXCIsIHVzZXIudmFsdWUudXNlcklkXSk7XG4gIGF3YWl0IGt2LmRlbGV0ZShbXCJ1c2Vyc1wiLCBcInVzZXJuYW1lXCIsIHVzZXIudmFsdWUudXNlcm5hbWVdKTtcbiAgYXdhaXQga3YuZGVsZXRlKFtcInVzZXJzXCIsIFwiZW1haWxcIiwgdXNlci52YWx1ZS5lbWFpbF0pO1xuXG4gIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiBcIlVzZXIgYW5kIGFsbCByZWxhdGVkIGRhdGEgcmVtb3ZlZCBzdWNjZXNzZnVsbHlcIiB9KSwgeyBzdGF0dXM6IDIwMCB9KTtcbn1cblxuc2VydmUoYXN5bmMgKHJlcSkgPT4ge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwpO1xuXG4gIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIiAmJiB1cmwucGF0aG5hbWUgPT09IFwiL3NpZ251cFwiKSB7XG4gICAgcmV0dXJuIGF3YWl0IGhhbmRsZVNpZ251cChyZXEpO1xuICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiICYmIHVybC5wYXRobmFtZSA9PT0gXCIvbG9naW5cIikge1xuICAgIHJldHVybiBhd2FpdCBoYW5kbGVMb2dpbihyZXEpO1xuICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiICYmIHVybC5wYXRobmFtZSA9PT0gXCIvc2VuZC1tZXNzYWdlXCIpIHtcbiAgICByZXR1cm4gYXdhaXQgaGFuZGxlU2VuZE1lc3NhZ2UocmVxKTtcbiAgfSBlbHNlIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiICYmIHVybC5wYXRobmFtZSA9PT0gXCIvbWVzc2FnZXNcIikge1xuICAgIHJldHVybiBhd2FpdCBoYW5kbGVHZXRNZXNzYWdlcyhyZXEpO1xuICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiICYmIHVybC5wYXRobmFtZSA9PT0gXCIvY3JlYXRlLWdyb3VwXCIpIHtcbiAgICByZXR1cm4gYXdhaXQgaGFuZGxlQ3JlYXRlR3JvdXAocmVxKTtcbiAgfSBlbHNlIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIiAmJiB1cmwucGF0aG5hbWUgPT09IFwiL2RlbGV0ZS1ncm91cFwiKSB7XG4gICAgcmV0dXJuIGF3YWl0IGhhbmRsZURlbGV0ZUdyb3VwKHJlcSk7XG4gIH0gZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIiAmJiB1cmwucGF0aG5hbWUgPT09IFwiL2RlbGV0ZVwiKSB7XG4gICAgcmV0dXJuIGF3YWl0IGhhbmRsZURlbGV0ZShyZXEpO1xuICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiICYmIHVybC5wYXRobmFtZSA9PT0gXCIvcmVtb3ZlXCIpIHtcbiAgICByZXR1cm4gYXdhaXQgaGFuZGxlUmVtb3ZlKHJlcSk7XG4gIH1cblxuICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTm90IEZvdW5kXCIsIHsgc3RhdHVzOiA0MDQgfSk7XG59LCB7IHBvcnQ6IDgwMDAgfSk7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxLQUFLLFFBQVEsK0NBQStDO0FBQ3JFLE9BQU8sNENBQTRDO0FBQ25ELFNBQVMsTUFBTSxNQUFNLFFBQVEsaUJBQWlCO0FBRTlDLE1BQU0sS0FBSyxNQUFNLEtBQUssTUFBTTtBQUU1QixlQUFlLGFBQWEsR0FBWTtFQUN0QyxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxNQUFNLElBQUksSUFBSTtFQUNwRCxNQUFNLG1CQUFtQixNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQUM7SUFBUztJQUFZO0dBQVM7RUFDckUsTUFBTSxnQkFBZ0IsTUFBTSxHQUFHLEdBQUcsQ0FBQztJQUFDO0lBQVM7SUFBUztHQUFNO0VBRTVELElBQUksaUJBQWlCLEtBQUssSUFBSSxjQUFjLEtBQUssRUFBRTtJQUNqRCxPQUFPLElBQUksU0FBUyxLQUFLLFNBQVMsQ0FBQztNQUFFLE9BQU87SUFBK0IsSUFBSTtNQUFFLFFBQVE7SUFBSTtFQUMvRjtFQUVBLE1BQU0sU0FBUztFQUNmLE1BQU0sT0FBTztJQUFFO0lBQVE7SUFBVTtJQUFPO0VBQVM7RUFFakQsTUFBTSxHQUFHLEdBQUcsQ0FBQztJQUFDO0lBQVM7SUFBTTtHQUFPLEVBQUU7RUFDdEMsTUFBTSxHQUFHLEdBQUcsQ0FBQztJQUFDO0lBQVM7SUFBWTtHQUFTLEVBQUU7RUFDOUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztJQUFDO0lBQVM7SUFBUztHQUFNLEVBQUU7RUFFeEMsT0FBTyxJQUFJLFNBQVMsS0FBSyxTQUFTLENBQUM7SUFBRSxTQUFTO0lBQWdDO0VBQU8sSUFBSTtJQUFFLFFBQVE7RUFBSTtBQUN6RztBQUVBLGVBQWUsWUFBWSxHQUFZO0VB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