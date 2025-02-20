import { useState } from "react";
import { CloudLightning, CloudOff, Mic, MicOff } from "react-feather";
import * as RLS from 'react-loader-spinner';
import Button from "./Button";

const { CirclesWithBar } = RLS;

function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      {isActivating ? <CirclesWithBar
          color="#1F2937"
          outerCircleColor="#1F2937"
          innerCircleColor="#1F2937"
          barColor="#1F2937"
          ariaLabel="circles-with-bar-loading"
          wrapperStyle={{}}
          wrapperClass="scale-50"
          visible={true}
        /> : ''}
      <Button
        onClick={handleStartSession}
        className={isActivating ? "bg-gray-600" : "bg-red-600"}
        icon={<CloudLightning height={16} />}
      >
        {isActivating ? "starting session..." : "start session"}
      </Button>
    </div>
  );
}

function SessionActive({ stopSession, setMutePc }) {
  const [mute, setMute] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  function muteSessionHandler() {
    console.log(`Hello? ${mute}`);
    setMute(prev => {
      setMutePc(!prev);
      return !prev;
    });
  }

  function stopSessionHandler() {
    if (disconnecting) return;

    setDisconnecting(true);
    stopSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full gap-4">
      {disconnecting ? <CirclesWithBar
        color="#1F2937"
        outerCircleColor="#1F2937"
        innerCircleColor="#1F2937"
        barColor="#1F2937"
        ariaLabel="circles-with-bar-loading"
        wrapperStyle={{}}
        wrapperClass="scale-50"
        visible={true}
      /> : ''}
      <Button
        onClick={muteSessionHandler}
        icon={mute ? <MicOff height={16} /> : <Mic height={16} />}
        className={(mute ? "bg-red-600" : "bg-blue-400") + " transition duration-150 ease-in-out"}
      >
        Mute
      </Button>
      <Button onClick={stopSessionHandler} icon={<CloudOff height={16} />}>
        {disconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  setMute,
  isSessionActive,
}) {
  return (
    <div className="flex gap-4 border-t-2 border-gray-200 h-full rounded-md">
      {isSessionActive ? (
        <SessionActive
          stopSession={stopSession}
          setMutePc={setMute}
        />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}
