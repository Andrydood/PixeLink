'use client';

import Image from "next/image";
import styles from "./page.module.css";
import {useEffect, useState, useRef} from 'react';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: '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', dangerouslyAllowBrowser:true });

const BASE_URL = 'http://localhost:3000/api'
const EVENT_INTERVAL = 1000;

const findLastMatch = (array, criteriaFunction) => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (criteriaFunction(array[i])) {
      return array[i];
    }
  }
  return null;
};

const getChampionNameForPlayerName = (playerName, playerList) => playerList.find(p => p.summonerName == playerName)?.championName;

const SUPPORTED_EVENTS = [
  'ChampionKill'
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [latestEvent, setLatestEvent] = useState({});
  const [messages, setMessages] = useState([]);
  const [playerList, setPlayerList] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [championName, setChamptionName] = useState('');
  const [sentiment, setSentiment] = useState(5);
  const effectRan = useRef(false);

  useEffect(() => {
    const startChat = async () => {
      try{
        const activePlayerResponse = await fetch(`${BASE_URL}/activeplayer`);
        const player = await activePlayerResponse.json();
        const returnedPlayerName = player.summonerName.split('#')[0]
        setPlayerName(returnedPlayerName);

        const playerListResponse = await fetch(`${BASE_URL}/playerlist`);
        const returnedPlayerList = await playerListResponse.json();
        const returnedChampionName = getChampionNameForPlayerName(returnedPlayerName, returnedPlayerList);
        setPlayerList(returnedPlayerList);
        setChamptionName(returnedChampionName);

        const firstMessages = [{ role: "system", content:
          `
          You are the league of legends character '${returnedChampionName}', and are chatting to the person playing as you on the game.
          The message only includes what the character wants to tell the player.
          React accordingly to how the player performs in the game.
          Act exactly as '${returnedChampionName}'  from league of legends would act.
          Speak with their intonation and characteristics.
          don't be overly positive.
          Their username is '${returnedPlayerName}'.
          The game has just started.
          The messages should be short.
          `
        }];

        const completion = await openai.chat.completions.create({
          messages: firstMessages,
          model: "gpt-3.5-turbo",
        });
        setLoading(false);
        setMessages([...firstMessages, completion.choices[0].message]);
      } catch(err){
        setTimeout(async () => {
          await startChat();
        }, 5000);
      }
    };


    if (!effectRan.current) {
      startChat();
    }

    return () => effectRan.current = true;
  }, []);

  useEffect(() => {
    if(messages.length > 0 && latestEvent.EventID){
      switch(latestEvent.EventName){
        case 'ChampionKill':
          if(latestEvent.VictimName == playerName){
            const killerName = latestEvent.KillerName;
            const killerChampion = getChampionNameForPlayerName(killerName, playerList);
            setMessages([
              ...messages,
              { role: "system", content:
                `${championName} was just killed${killerChampion ? ` by ${killerChampion}` : ""}`
                }]
              );
          } else if (latestEvent.KillerName == playerName){
            const victimName = latestEvent.VictimName;
            const victimChampion = getChampionNameForPlayerName(victimName, playerList);
            setMessages([
              ...messages,
              { role: "system", content:
                `${championName} just killed${victimChampion ? ` ${victimChampion}` : ""}`
                }]
              );
          }
        default:
      }
    }

    const getEventData = async () => {
      const response = await fetch(`${BASE_URL}/eventdata`);
      const data = await response.json();
      if(data.Events){
        const latestReturnedEvent = findLastMatch(data.Events, (event) => SUPPORTED_EVENTS.includes(event.EventName));
        if(latestReturnedEvent && latestReturnedEvent.EventID !== latestEvent.EventID){
          setLatestEvent(latestReturnedEvent);
        }
      }
    };

    const interval = setInterval(async () => {
      await getEventData();
    }, EVENT_INTERVAL);

    return () => clearInterval(interval); // This represents the unmount function, in which you need to clear your interval to prevent memory leaks.
  }, [latestEvent]);

  useEffect(()=>{
    const queryAI = async () => {
      console.log(messages);
      const completion = await openai.chat.completions.create({
        messages,
        model: "gpt-3.5-turbo",
      });

      setMessages([...messages, completion.choices[0].message]);

      const sentimentCompletion = await openai.chat.completions.create({
        messages: [{ role: "system", content:
        `
        Grade how positive this message is out of 10.
        This is the message: "${completion.choices[0].message.content}"
        Only return the number.
        `
        }],
        model: "gpt-3.5-turbo",
      });
      setSentiment(parseInt(sentimentCompletion.choices[0].message.content));
    }

    const latestMessage = messages[messages.length - 1];
    if(latestMessage && latestMessage.role !== 'assistant'){
      queryAI();
    }
  }, [messages]);

  const userMessages = messages.filter(m => m.role =='assistant');

  return (
    <main className={styles.main}>
      {loading ? <div className={styles.loading}>Loading...</div> : (
        <div className={styles.chatWindow}>
          <div className={styles.imageContainer}>
            <Image
            src={`https://ddragon.leagueoflegends.com/cdn/12.4.1/img/champion/${championName}.png`}
            alt=""
            width={120}
            height={120} />
            <div className={styles.sentimentContainer}>
              <div className={[styles.sentimentBar]} style={{width:`${sentiment*10}%`}}></div>
            </div>
          </div>
          <div className={styles.messagesContainer}>
                 <div className={styles.messageContainer}>
                  <p className={styles.message}>
                  {userMessages[userMessages.length-1].content}
                  </p>
                </div>
          </div>
        </div>
      )}
    </main>
  );
}
