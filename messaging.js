document.addEventListener("DOMContentLoaded", function () {
  const sendBtn = document.getElementById("send");
  const usernameLabel = document.getElementById("username");
  const chatBox = document.getElementById("chatBox");
  const messageField = document.getElementById("messageField");
  const suggestionsBox = document.getElementById("suggestions");

  let username;
  let ws;

  /**
   * This function generates a random username by combining a randomly selected adjective and noun.
   * The adjectives and nouns are predefined in the function.
   * @returns {string} The randomly generated username, which is a combination of an adjective and a noun.
   */
  function chooseUsername() {
    let adjectives = [
      "happy",
      "funny",
      "serious",
      "delightful",
      "mysterious",
      "lovely",
      "charming",
      "friendly",
      "brave",
      "confident",
      "strong",
      "proud",
      "humble",
      "lucky",
      "rich",
    ];
    let nouns = [
      "dog",
      "cat",
      "mouse",
      "monkey",
      "giraffe",
      "rhinoceros",
      "ant",
      "bee",
      "train",
      "river",
      "mountain",
      "sun",
      "moon",
    ];
    return (
      adjectives[Math.floor(Math.random() * adjectives.length)] +
      " " +
      nouns[Math.floor(Math.random() * nouns.length)]
    );
  }

  /**
   * Processes the received update from the server.
   * The server will send one of two events: message updates or suggested replies.
   * If the type of the response is "message", it will update the chatbox with the sender and the content of the message.
   * If the type of the response is "suggestions", it will update the suggestions with the content of the response.
   *
   * @param {string} response - The response received from the server in string format. The response is parsed to JSON within the function.
   */
  function onRecieveUpdate(response) {
    response = JSON.parse(response);
    // Server will send one of two events: message updates or suggested replies
    if (response.type == "message") {
      updateChatbox(response.sender, response.content, false);
    } else if (response.type == "suggestions") {
      updateSuggestions(response.content);
    }
  }

  /**
   * Updates the chat box with the new message.
   *
   * This function creates a new HTML element to contain the message,
   * adds the appropriate CSS class based on the sender of the message,
   * and appends the message to the chat box. If the sender is the current user,
   * the message is shown on the right side of the chat box. If the sender is another user,
   * the message is shown on the left side with the sender's username.
   * After appending the message, the function scrolls the chat box to the bottom
   * and clears the message input field.
   *
   * @param {string} sender - The username of the sender of the message.
   * @param {string} message - The message text.
   */
  function updateChatbox(sender, message) {
    let formattedMessage = document.createElement("pre");
    if (sender == username) {
      // Show my own messages on the RHS
      formattedMessage.classList.add("myMessage");
      formattedMessage.textContent = message;
    } else {
      // Show other messages with usernames on the LHS
      formattedMessage.textContent = sender + ": " + message;
    }
    chatBox.append(formattedMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
    messageField.value = "";
  }

  /**
   * This function autofills the message field with a provided message.
   *
   * @param {string} message - The message to be autofilled in the message field.
   */
  function autofillMessage(message) {
    messageField.value = message;
  }

  /**
   * Updates the list of suggestions in the UI based on the given string of suggestions.
   * The string is split into an array of suggestions, each suggestion is trimmed of whitespace,
   * and any empty strings are removed. If exactly three suggestions are successfully parsed,
   * the suggestions box in the UI is made visible and each suggestion is set as the text content
   * of a button in the suggestions box. Clicking on a suggestion button will autofill the message input field
   * with that suggestion. If less or more than three suggestions are parsed, the suggestions box is hidden.
   *
   * @param {string} suggestions - A string of suggestions, where each suggestion is separated by a newline.
   */
  function updateSuggestions(suggestions) {
    // We do some string processing of the llm output since it's not structured data
    // TODO: Send llm output encoded as JSON
    console.log(suggestions);
    suggestions = suggestions
      .split("\n")
      .map((s) => s.replace(/\d+. /g, "").trim())
      .filter((s) => s);
    console.log(suggestions);

    // Update suggestion options if we successfully parse 3 values from llm output
    if (suggestions.length == 3) {
      suggestionsBox.style.visibility = "visible";
      for (let i = 0; i < 3; i++) {
        var suggestionButton = suggestionsBox.getElementsByTagName("button")[i];
        suggestionButton.textContent = suggestions[i];
        suggestionButton.onclick = () => autofillMessage(suggestions[i]);
      }
    } else {
      suggestionsBox.style.visibility = "hidden";
    }
  }

  /**
   * Initializes the WebSocket connection and sets up event handlers.
   * If a WebSocket connection is already established, it is closed before a new one is opened.
   * The onopen event logs a message to the console.
   * The onmessage event routes updates to the onRecieveUpdate function.
   * The onclose event sets the WebSocket object to null.
   * A random username is chosen for the session and displayed in the usernameLabel.
   */
  function init() {
    if (ws) {
      ws.onerror = ws.onopen = ws.onclose = null;
      ws.close();
    }

    // Establish new websocket connection
    ws = new WebSocket("ws://localhost:8888");
    ws.onopen = () => {
      console.log("Connection opened!");
    };

    // Route updates to message handler onRecieveUpdate
    ws.onmessage = ({ data }) => onRecieveUpdate(data.toString());
    ws.onclose = function () {
      ws = null;
    };

    // Choose a random username for this session
    username = chooseUsername();
    usernameLabel.textContent = username;
  }

  /**
   * This function is triggered when the send button is clicked. It first checks if the websocket connection (ws) is still active.
   * If the connection is lost, it updates the chatbox with a message stating that the connection to the server has been lost.
   * If the connection is active, it creates a response object containing the username and message content,
   * then sends this object as a JSON string to the server via the websocket connection.
   * After sending the message, it updates the chatbox with the user's message and clears the suggestions box.
   */
  sendBtn.onclick = function () {
    if (!ws) {
      updateChatbox(username, "Lost connection to server.");
      return;
    }

    // Send my message to server
    let response = {
      sender: username,
      content: messageField.value,
    };
    ws.send(JSON.stringify(response));

    // Update chatbox with my own message
    updateChatbox(username, response.content);

    // Clear suggestions box
    updateSuggestions("");
  };

  // Initialize after DOMContentLoad
  init();
});
