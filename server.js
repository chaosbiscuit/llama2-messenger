const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const Ollama = require("@langchain/community/llms/ollama");

const port = 8888;
const server = http.createServer(express);
const wss = new WebSocket.Server({ server });

const ollama = new Ollama.Ollama({
  baseUrl: "http://localhost:11434",
  model: "llama2",
  // TODO: Experiencing some instabilty/unresponsiveness with JSON setting
  // format: "json",
  // stream: false
});

/**
 * This function handles the WebSocket server connection.
 * When a message is received from a client, it sends the message data and suggestion data to all other connected clients.
 *
 * @param {object} ws - The WebSocket connection object.
 *
 * @listens {event} message - Listens for a 'message' event on the WebSocket connection.
 * @fires {method} client.send - Sends data to the client.
 *
 * @callback incoming - A callback function that is called when a message is received from a client.
 * It parses the incoming data and sends the message content and suggestion data to all other connected clients.
 *
 * @callback each - A callback function that is called for each client connected to the WebSocket server.
 * It checks if the client is not the one who sent the message and if the client's readyState is OPEN.
 * If true, it sends the message data and suggestion data to the client.
 *
 * @async
 */
wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(inc) {
    wss.clients.forEach(async function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        let data = JSON.parse(inc.toString("utf8"));

        // Send message data to other clients
        let message = data.content;
        const response = {
          type: "message",
          sender: data.sender,
          content: message,
        };
        client.send(JSON.stringify(response));

        // Send suggestion data to other clients
        response.type = "suggestions";
        response.content = await ollama.call(
          `A person named "${data.sender}" said to me "${message}". Numerically list 3 extremely brief responses.`
        );
        client.send(JSON.stringify(response));
      }
    });
  });
});

server.listen(port, function () {
  console.log(`Server is listening on port: ${port}`);
});
