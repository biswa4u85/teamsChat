import React from "react";
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Chats from './Chats'
// import ChatElements from './ChatElements'

function App() {
  // if (!window?.frappe?.session?.user) {
  //   return <p style={{ textAlign: "center", margin: 10 }}>you don't have access</p>
  // }
  return (
    <>
      <ToastContainer />
      <Chats />
      {/* <ChatElements /> */}
    </>
  );
}

export default App;
