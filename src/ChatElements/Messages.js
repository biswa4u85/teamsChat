import React, { useRef, useState, useEffect } from "react";
import { MessageList } from "react-chat-elements"

function Messages() {
  return (<MessageList
    className='message-list'
    lockable={true}
    toBottomHeight={'100%'}
    dataSource={[
      {
        position: "left",
        type: "text",
        title: "Kursat",
        text: "Give me a message list example !",
      },
      {
        position: "right",
        type: "text",
        title: "Emre",
        text: "That's all.",
      },
    ]}
  />);
}

export default Messages;
