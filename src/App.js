import { fetchEventSource } from "@microsoft/fetch-event-source";
import React, { useEffect, useState } from 'react';
import './App.css';
import logo from './logo.svg';

const serverBaseURL = "http://localhost:8080";

const App = () => {
  const [data, setData] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      class RetriableError extends Error { }
      class FatalError extends Error { }

      await fetchEventSource(`${serverBaseURL}/last`, {
        method: "GET",
        headers: {
          "accept": "text/event-stream;charset=UTF-8",
        },
        signal: controller.signal,
        async onopen(res) {
          if (res.ok && res.status === 200) {
            // console.log("Connection made ", res);
            return; // everything's good
          } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            console.log("Client side error ", res);
            throw new FatalError(); // client-side errors are usually non-retriable
          } else {
            throw new RetriableError();
          }
        },
        onmessage(event) {
          // if the server emits an error message, throw an exception
          // so it gets handled by the onerror callback below:
          if (event.event === 'FatalError') {
            throw new FatalError(event.data);
          }
          console.log(event.data);
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
        },
        onclose() {
          // console.log("Connection closed by the server");
          // if the server closes the connection unexpectedly, retry:
          throw new RetriableError();
        },
        onerror(err) {
          // console.log("There was an error from server", err);
          if (err instanceof FatalError) {
            throw err; // rethrow to stop the operation
          } else {
            // do nothing to automatically retry. You can also
            // return a specific retry interval here.
            return 5000;
          }
        },
      });

      // await fetchEventSource(`${serverBaseURL}/last`, {
      //   onmessage(ev) {
      //     let data = JSON.parse(ev.data);
      //     console.log(data);
      //     setData(data);
      //   }
      // });

    };
    fetchData();

    // window.onload = () => {
    //   let last = new EventSource(serverBaseURL + '/last');
    //   last.onmessage = (e) => {
    //     let data = JSON.parse(e.data);
    //     console.log(data);
    //     setData(data);
    //   };
    // }

    return () => controller.abort();

  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h2>Your lucky letter is {data.letter}</h2>
        <p>generated on {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(data.created)}</p>
      </header>
    </div>
  );
};

export default App;