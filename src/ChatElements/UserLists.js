import React, { useRef, useState, useEffect } from "react";
import { ChatList } from "react-chat-elements"

function UserLists(props) {
  const { data, selectChat } = props
  return (<ChatList
    className='chat-list'
    dataSource={
      Object.keys(data).map((key, k) => {
        let chats = data[key] ? data[key] : null
        if (chats) {
          let _live = parseInt(chats.live) ? '<span style="color: red;">LIVE</span>' : '';
          let full_name = `${chats.first_name || ''} ${chats.last_name || ''}`.trim();
          let _tab_identifier = `${chats.mobile_number} ${chats.telegram_username ? '(@' + chats.telegram_username + ')' : ''} - ${full_name}`;
          let timestamp = parseInt(chats?.last_msg?.timestamp) * 1000 || 0;
          let _tab_msg = `${parseInt(chats?.last_msg?.sender) ? 'Bot' : 'User'}: ${chats?.last_msg?.content || 'New Chat'}`;
          let isImg = _tab_msg.split(':\nIMG:')
          return {
            avatar: `https://ui-avatars.com/api/?name=${chats.first_name + ' ' + chats.last_name}`,
            title: <span className="message-head" dangerouslySetInnerHTML={{ __html: _live + ' ' + _tab_identifier }}></span>,
            subtitle: <span className="message-text" dangerouslySetInnerHTML={{ __html: _tab_msg }} />,
            date: new Date(timestamp),
            unread: chats.messages?.length,
            alt: chats.first_name + ' ' + chats.last_name,
            className: `friend-drawer-item ch_${chats.name}`,
            id: chats.name,
          }
        }
      })
    }
    onClick={selectChat}
  />);
}

export default UserLists;
