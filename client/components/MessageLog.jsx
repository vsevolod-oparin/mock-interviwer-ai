import { Twitch, User } from "react-feather";
import { useState } from "react";

function compressed(messages) {
  if (messages.length == 0) { return messages; }

  /*const iids = [];
  const contents = [];
  for (let i = 0; i < messages.length; i++) {
    iids.push(messages[i].event_id);
    contents.push(messages[i].content);
  }
  console.log('---');
  console.log(iids.join(" / "));
  console.log(contents.join(" / "));
  console.log('---');*/


  const compressed = [];
  var current = {...messages[0]};
    
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].content == null || messages[i].content === '') {continue;}
    if (messages[i].event_id === current.event_id) { continue; }
    if (messages[i].isClient != current.isClient) {
      compressed.push(current);
      current = {...messages[i]};
    } else {
      current.content = messages[i].content + current.content;
    }
  }
  compressed.push(current);
  return compressed;
}

function Message({ message }) {
  const alignment = message.isClient ? "flex-row-reverse" : "flex-row";
  const bg_color = message.isClient ? "bg-slate-200" : "bg-violet-200";
  return (
    <div className={`flex ${alignment}`}>
      <div className={`flex flex-col w-3/4 gap-2 p-2 rounded-md ${bg_color}`}>
        <div
          className="flex items-center gap-2 cursor-pointer"
        >
          {message.isClient ? (
            <User className="text-green-600" />
          ) : (
            <Twitch className="text-blue-600" />
          )}
          <div className="text-xl text-gray-800">
            {message.isClient ? "You" : "AI"} | {message.timestamp}
          </div>
        </div>
        <div
          className={`text-gray-500 bg-white p-2 rounded-md overflow-x-auto block`}
        >
          <pre className="text-lg text-wrap">&nbsp;{message.content}</pre>
          {/* <pre className="text-xs">{JSON.stringify(message, null, 2)}</pre> */}
        </div>
      </div>
    </div>
  );
}

export default function MessageLog({ progressMessage, progressContent, messages }) {
  const messagesToDisplay = [];

  if (progressMessage !== null) {
    progressMessage.content = progressContent.join('');
    messagesToDisplay.push(
      <Message
        key={progressMessage.event_id}
        message={progressMessage}
      />,
    );
  }

  const messagesCompressed = compressed(messages);
  messagesCompressed.forEach((message) => {
    messagesToDisplay.push(
      <Message
        key={message.event_id}
        message={message}
      />,
    );
  });

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {messagesCompressed.length === 0 && progressMessage === null ? (
        <div className="text-gray-500">Awaiting messages...</div>
      ) : (
        messagesToDisplay
      )}
    </div>
  );
}
