import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import MessageLog from "./MessageLog";
import SessionControls from "./SessionControls";
import Evaluation from "./Evaluation";
import InterviewControl from './InterviewControl';


function fmessage(isClient, content, timestamp, event_id, progress) {
  return {
    isClient: isClient,
    content: content,
    timestamp: timestamp,
    event_id: event_id,
    is_progress: progress,
  };
}

function fetchMessage(event) {
  var isClient = null;

  const isProgressMessage = event.type === "response.audio_transcript.delta";

  isClient = event.type === "conversation.item.input_audio_transcription.completed" ? true : isClient;
  isClient = event.type === "response.audio_transcript.done" ? false : isClient;
  isClient = isProgressMessage ? false : isClient;

  if (isClient === null) { return null; }

  var content = isProgressMessage ? event.delta : event.transcript;
  content = content == null ? "" : content; // both null and undefined

  return fmessage(
    isClient,
    content,
    new Date().getTime(),
    event.event_id,
    isProgressMessage
  );
}

function intro_message(data) {
  const info_list = [
    "Hello, I need behavior interview. Below I'll provide all the necessary information."
  ];
  if (data.role !== null) { info_list.push(`Role: <role>${data.role}</role>`); }
  if (data.job_description !== null) { 
      info_list.push(`Job Description: <job_description>${data.job_description}</job_description>`); 
    } 
  if (data.resumeText !== null) { info_list.push(`Resume: <resume>${data.resumeText}</resume>`); } 
  info_list.push(
    "Greet me with my first name, explain briefly the structure of the interview and proceed asking questions one at a time. " +  
    "If you see some previous job experience, mention them specificly. " + 
    "Make intro short.");
  return info_list.join('\n\n');
}

const eval_prompt = `Given my responses to the question and job description, provide the feedback in the following form:

---
Rating: <x> / 10
<Short explanation why you gave me that score>

Areas to Improve:
- Qualification -- <advice to align my skills with the job description>.
- Clarity -- <advice on how I can express my thoughts more clear and concise.
- Relevance -- <advice if I can make my answers more relevant to the questions you asked>
---
Translate the form above into the language the user used. For example, if they speak in Russian, use Russian.

- All <advices> should be one-two sentences and strictly related to the answers I gave. 
Advices must be actionable and be specific about what to do next.
- <x> can be from 1 to 10.
- If you last messages were not in English, translate into the language the user used.`;


export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);

  const [messages, setMessages] = useState([]);
  const [progressMessage, setProgressMessage] = useState(null);
  const [progressContent, setProgressContent] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const userData = useRef({
    role: null,
    job_description: null,
    cv: null,
    resumeText: null
  });

  // Magic part that makes connection between me and openai server over RTC
  async function startSession() {
    setMessages([]);
    setProgressMessage(null);
    setProgressContent([]);
    setEvaluation(null);

    // Get an ephemeral key from the Fastify server
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  function setMute(value) {
    const audioTrack = peerConnection.current.getSenders().find(sender => sender.track.kind === 'audio').track;
    audioTrack.enabled = !value;
  }

  // Stop current session, clean up peer connection and data channel
  function closeSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    
    setDataChannel(null);
    setIsSessionActive(false);
    peerConnection.current = null;
  }

  function stopSession() {
    setMute(true);

    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: eval_prompt,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create", response: {"modalities": ["text"]} });
  }

  

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event_obj = JSON.parse(e.data)
        console.log(event_obj);
        if (event_obj.type === "response.text.done") {
          console.log(`---- ${event_obj.text.trim()}`)
          setEvaluation(event_obj.text.trim());
          closeSession();
          return;
        }
        const message = fetchMessage(event_obj);
        if (message !== null) { 
          if (message.isClient) {
            setMessages((prev) => [message, ...prev]);
          } else if (!message.is_progress) {
            setMessages((prev) => [message, ...prev]);
            setProgressMessage(null);
            setProgressContent([]);
          } else if (progressMessage === null) {
            setProgressMessage((prev) => prev === null ? message : prev);
            setProgressContent((prev) => [...prev, message.content]);
          } else {
            setProgressContent((prev) => [...prev, message.content]);
          }
        }
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setMessages([]);
        sendTextMessage(intro_message(userData.current));
      });
    }
  }, [dataChannel]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 text-2xl w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1>Mock Interview AI</h1>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 w-[380px] left-0 bottom-16 p-4 pt-0 overflow-y-auto">
          <InterviewControl userData={userData}/>
        </section>
        <section className="absolute top-0 left-[380px] right-[380px] bottom-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
            <MessageLog 
              progressMessage={progressMessage} 
              progressContent={progressContent} 
              messages={messages} 
            />
          </section>
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              setMute={setMute}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-16 p-4 pt-0 overflow-y-auto">
          <Evaluation
            evaluation={evaluation}
          />
        </section>
        
      </main>
    </>
  );
}
