import React, { useRef, useState, useEffect } from "react";
import $ from 'jquery';
import Config from "./Config";
import { parse_msgs, time_ago, moveObjectElement } from './Utils'
import { apiPostCall, fileUpload } from './services/site-apis'
import Emoji from './Emoji'

const recentTabOptions = [
  { value: 'all', label: 'ALL' },
  { value: '1', label: 'Day' },
  { value: '7', label: 'Week' },
  { value: '30', label: 'Month' },
  { value: '365', label: 'Year' },
]
const stateTabOptions = [
  { value: 'all', label: 'ALL' },
  { value: 'account', label: 'Account' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdraw' },
  { value: 'blocked', label: 'Blocked' },
]

function Chats() {
  const tempMessagesIds = useRef({});
  const chatMenuRef = useRef();
  const messageRef = useRef();
  let brandWiseChats = useRef({});
  let selBrand = useRef(null);
  const [brands, setBrands] = useState({})
  const [currentChats, setCurrentChats] = useState([])
  let recent = useRef(recentTabOptions[0]);
  const [recentVal, setRecentVal] = useState(recentTabOptions[0])
  let state = useRef(stateTabOptions[0]);
  const [stateVal, setStateVal] = useState(stateTabOptions[0])
  let selChatType = useRef('all');
  const [templates, setTemplates] = useState([])
  let timer = useRef(null);
  const [selTemplate, setSelTemplate] = useState([])
  const [search, setSearch] = useState('')
  let selChatsLive = useRef({});
  const [selChats, setSelChats] = useState(null)
  let messagesLive = useRef({});
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [live, setLive] = useState(false)

  useEffect(() => {
    getChats(null)
    window?.frappe?.socketio.init(9000);
    window?.frappe?.socketio.socket.on("send_message", recvMessage);
    // window?.frappe?.socketio.socket.on("send_chat", recvChat);
    setInterval(() => {
      updateTime(5)
      // recvMessage(`{\"mobile_number\": \"MN-00041042\", \"brand\": \"JitoDaily\", \"conversation\": \"CONV-1656600076990\", \"state\": \"error_menu\", \"message_id\": \"792951\", \"sender\": \"0\", \"message_type\": \"0\", \"content\": \"Hi\", \"timestamp\": \"1660645221\\n\", \"live\": 0}`)
    }, 1000)
  }, []);


  const getChats = async (mobileNumber) => {
    let params = `cmd=mahadev.mahadev.doctype.conversation_log.conversation_log.get_conversationsnew`;
    if (mobileNumber) {
      params = `mobile_number=${mobileNumber}&cmd=mahadev.mahadev.doctype.conversation_log.conversation_log.get_conversationsnew`;
    }
    let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
    if (data.message) {
      randerBrandWiseChats(data.message, (mobileNumber ? false : true))
    }
  }

  const loadPrevConversation = async () => {
    if (selChats) {
      let params = `doctype=Conversation+Log&name=${selChats.previous_conversation}&cmd=frappe.client.get`;
      let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
      if (data.message) {
        data.message.messages = parse_msgs(data.message.messages);
        let tempMessages = JSON.parse(JSON.stringify(messages))
        let newMessages = [...data.message.messages, ...tempMessages]
        messagesLive.current = newMessages
        setMessages(newMessages)
      }
    }
  }

  const recvMessage = (msg) => {
    let data = JSON.parse(msg);
    if (data && data.content) {
      data.content = data.content ? decodeURIComponent(data.content) : data.content;

      // check New User
      if (data.mobile_number in tempMessagesIds.current === false) {
        tempMessagesIds.current[data.mobile_number] = data.brand
        getChats(data.mobile_number)
      }

      // Update Chat Messages
      if (selChatsLive.current && selChatsLive.current.name == data.mobile_number) {
        let newMessage = [...messagesLive.current, data]
        messagesLive.current = newMessage
        setMessages(messagesLive.current)
        setTimeout(() => chatMenuRef.current.scrollIntoView({ behavior: "smooth" }), 100)
      }

      // Update Chat Menu 
      if (brandWiseChats.current[data.brand] && data.mobile_number) {
        let newData = JSON.parse(JSON.stringify(brandWiseChats.current[data.brand][data.mobile_number]))
        if (newData) {
          newData.messages.push(data)
          newData.last_seen = data.timestamp;
          newData.live = data.live
          newData.state = data.state;
          newData.last_msg = data;
          newData.liveStarted = (data.content).includes('Live Chat started') ? true : false
          brandWiseChats.current[data.brand][data.mobile_number] = newData
          if (data.brand == selBrand.current) {
            let _live = parseInt(newData.live) ? '<span style="color: red;">LIVE</span>' : '';
            let full_name = `${newData.first_name || ''} ${newData.last_name || ''}`.trim();
            let _tab_identifier = `${newData.mobile_number} ${newData.telegram_username ? '(@' + newData.telegram_username + ')' : ''} - ${full_name}`;
            let _tab_msg = `${parseInt(newData?.last_msg?.sender) ? 'Bot' : 'User'}: ${newData?.last_msg?.content || 'New Chat'}`;
            let timestamp = parseInt(newData?.last_seen) * 1000 || 0;
            let _tab_time = timestamp ? time_ago(timestamp) : '';
            $(`#${data.mobile_number} .message-time`).text(_tab_time);
            $(`#${data.mobile_number} .message-count`).text(newData?.messages?.length);
            $(`#${data.mobile_number} .message-head`).html(`${_live} ${_tab_identifier}`);
            $(`#${data.mobile_number} .message-text`).html(_tab_msg);
            $(`#${data.mobile_number}`).prependTo($("#chatBox"));
          }
          if (newData.liveStarted) {
            randerBrands(false, data.brand)
            playSound(data.brand)
            setTimeout(() => playSound(data.brand), 2000)
          }
        }
      }
    }
  }

  const recvChat = (msg) => {
    let data = JSON.parse(msg);
    randerBrandWiseChats([data], false)
  }

  const randerBrandWiseChats = (data, brand = null) => {
    let tempOldData = JSON.parse(JSON.stringify(brandWiseChats.current))

    // Make last msg
    for (let item of data) {
      tempMessagesIds.current[item.name] = item.brand
      item.messages = parse_msgs(item.messages);
      let last_msg = {};
      if (item.messages) last_msg = item.messages[item.messages.length - 1];
      item.last_msg = last_msg;
      item.last_seen = parseInt(last_msg.timestamp);
    }

    // Sort Array First
    data = data.sort(function (a, b) {
      return new Date(b.last_seen) - new Date(a.last_seen);
    });

    // Group By Brand
    for (let item of data) {
      if (item.brand in tempOldData === false) {
        tempOldData[item.brand] = { [item.name]: item }
      } else {
        if (item.name in tempOldData[item.brand] === false) {
          tempOldData[item.brand][item.name] = item
        }
      }
    }
    brandWiseChats.current = tempOldData
    randerBrands(brand, null)
    if (!brand && data && data[0] && brandWiseChats.current[selBrand.current]) {
      let sortCurrentChats = moveObjectElement(data[0].name, '', JSON.parse(JSON.stringify(brandWiseChats.current[selBrand.current])));
      let sortable = Object.values(sortCurrentChats)
      sortable = sortable.sort(function (a, b) {
        return new Date(b.last_seen) - new Date(a.last_seen);
      });
      setCurrentChats(sortable)
    }
    filterChats()
  }

  const randerBrands = (brand = false, sort = null) => {
    let tempOldData = JSON.parse(JSON.stringify(brandWiseChats.current))
    // Get All Counts
    let allBrands = {}
    for (let key in tempOldData) {
      let newChats = tempOldData[key]
      let live_chats = [];
      let not_live_chats = [];
      let success_chats = [];
      let process_chats = [];
      let failed_chats = [];
      for (let c in newChats) {
        // Live Filter
        if (newChats[c].live)
          live_chats.push(c);
        else
          not_live_chats.push(c);
        // State Filter
        let state = newChats[c].state || '';
        if (state.includes('success'))
          success_chats.push(c);
        else if (state.includes('failed'))
          failed_chats.push(c);
        else if (['account', 'deposit', 'withdraw'].find(v => state.includes(v)))
          process_chats.push(c);
      }
      // Update Counts
      allBrands[key] = { all: Object.keys(newChats).length, fail: failed_chats.length, live: live_chats.length, process: process_chats.length }
    }
    let sortBrands = allBrands
    if (sort) {
      sortBrands = moveObjectElement(sort, '', allBrands);
    }
    setBrands(sortBrands)
    if (brand) {
      selectBrand(Object.keys(allBrands)[0])
    }
  }

  const selectBrand = (data) => {
    selBrand.current = data
    let currentChats = JSON.parse(JSON.stringify(brandWiseChats.current[data]))
    let sortable = Object.values(currentChats)
    sortable = sortable.sort(function (a, b) {
      return new Date(b.last_seen) - new Date(a.last_seen);
    });
    setCurrentChats(sortable)
    setSelTemplate([])
    getTemplate(data)
    messagesLive.current = []
    setMessages([])
    filterChats()
  }

  const getTemplate = async (name) => {
    let params = `doctype=Chat+Template&filters=%7B%22brand%22%3A%22${name}%22%7D&limit_page_length=None&fields=%5B%22name%22%2C%22brand%22%2C%22template_message%22%5D&cmd=frappe.client.get_list`;
    let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
    if (data.message) {
      setTemplates(data.message)
    }
  }

  const filterChats = (search = null) => {

    setTimeout(() => {

      let currentChats = {}
      if (selBrand.current) {
        currentChats = JSON.parse(JSON.stringify(brandWiseChats.current[selBrand.current]))
      }

      let live_chats = [];
      let not_live_chats = [];
      let success_chats = [];
      let process_chats = [];
      let failed_chats = [];

      let recent_1_chats = [];
      let recent_7_chats = [];
      let recent_30_chats = [];
      let recent_365_chats = [];

      let account_chats = [];
      let deposit_chats = [];
      let withdraw_chats = [];
      let blocked_chats = [];

      for (let c in currentChats) {
        // Live Filter
        if (currentChats[c].live)
          live_chats.push(c);
        else
          not_live_chats.push(c);

        // Recent Filter
        let msg_date = +new Date(parseInt(currentChats[c].last_seen) * 1000);
        let recent_date = +new Date() - (1 * 3600 * 24 * 1000);
        if (msg_date > recent_date)
          recent_1_chats.push(c);
        recent_date = +new Date() - (7 * 3600 * 24 * 1000);
        if (msg_date > recent_date)
          recent_7_chats.push(c);
        recent_date = +new Date() - (30 * 3600 * 24 * 1000);
        if (msg_date > recent_date)
          recent_30_chats.push(c);
        recent_date = +new Date() - (365 * 3600 * 24 * 1000);
        if (msg_date > recent_date)
          recent_365_chats.push(c);


        // State Filter
        let state = currentChats[c].state || '';
        if (state.includes('success'))
          success_chats.push(c);
        else if (state.includes('failed'))
          failed_chats.push(c);
        else if (['account', 'deposit', 'withdraw'].find(v => state.includes(v)))
          process_chats.push(c);
        if (state.includes('account'))
          account_chats.push(c);
        else if (state.includes('deposit'))
          deposit_chats.push(c);
        else if (state.includes('withdraw'))
          withdraw_chats.push(c);
        else if (state.includes('blocked'))
          blocked_chats.push(c);
        $(`#${currentChats[c].name}`).removeClass("tab-hidden");
      }


      for (let c in currentChats) {

        // Live Filter
        if (selChatType.current == 'live' && !live_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (selChatType.current == 'notLive' && !not_live_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (selChatType.current == 'success' && !success_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (selChatType.current == 'process' && !process_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (selChatType.current == 'fail' && !failed_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");

        // Recent Filter
        if (recent.current.value == '1' && !recent_1_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (recent.current.value == '7' && !recent_7_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (recent.current.value == '30' && !recent_30_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (recent.current.value == '365' && !recent_365_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");

        // State Filter  
        if (state.current.value == 'account' && !account_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (state.current.value == 'deposit' && !deposit_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (state.current.value == 'withdraw' && !withdraw_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
        else if (state.current.value == 'blocked' && !blocked_chats.includes(c))
          $(`#${currentChats[c].name}`).addClass("tab-hidden");
      }

      // Search Value
      if (search) {
        for (let c in currentChats) {
          let data_str = `${currentChats[c].first_name} ${currentChats[c].last_name} ${currentChats[c].telegram_username} ${currentChats[c].state} ${currentChats[c].current_conversation} ${currentChats[c].mobile_number}`.toLowerCase();
          if (!data_str.includes((search).toLowerCase())) {
            $(`#${currentChats[c].name}`).addClass("tab-hidden");
          }
        }
      }

    }, 100)

  }

  const selectChat = (item) => {
    let data = JSON.parse(JSON.stringify(brandWiseChats.current[item.brand][item.name]))
    $('.leftMenu').each(function () {
      $(this).find('.friend-drawer').removeClass('tab-focus');
    });
    $(`#${data.name}`).addClass("tab-focus");
    data['time_str'] = new Date(data?.last_msg?.timestamp * 1000).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true })
    setSelChats(data)
    selChatsLive.current = data
    messagesLive.current = data.messages
    setMessages(data.messages)
    setNewMessage('')
    setTimeout(() => chatMenuRef.current.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const addEmoji = (data) => {
    if (selChats) {
      setNewMessage(`${newMessage} ${data.emoji} `)
      messageRef.current.focus()
    }
  }

  const addTemplate = (data) => {
    if (selChats) {
      let message = newMessage.split('/')
      setNewMessage(`${message[0]} ${data.template_message} `)
      setSelTemplate([])
      messageRef.current.focus()
    }
  }

  const addMessage = (data) => {
    let checkTemplate = data.split('/')
    if (checkTemplate[1]) {
      clearTimeout(timer.current)
      let selTemplate = []
      timer.current = setTimeout(() => {
        for (let item of templates) {
          if ((String(item.name).toLowerCase()).search(checkTemplate[1].toLowerCase()) != -1) {
            selTemplate.push(item)
          }
        }
        setSelTemplate(selTemplate)
      }, 500)
    } else {
      setSelTemplate([])
    }
    if (selChats) {
      setNewMessage(data)
      messageRef.current.focus()
    }
  }

  const uploadFile = async (event) => {
    if (selChats) {
      let data = await fileUpload(event.target.files[0], window?.frappe?.csrf_token)
      if (data.message) {
        let file = `${Config.apiURL}${data.message.file_url}`
        let params = `telegram_id=${selChats.telegram_id}&brand=${selChats.brand}&message=%3Cb%3E${window?.frappe?.full_name}%3C%2Fb%3E%3A%0AIMG:${file}%0A&cmd=mahadev.mahadev.func.send_message`;
        let data1 = await apiPostCall('/', params, window?.frappe?.csrf_token)
        if (data1) {
          setNewMessage('')
        }
      }
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selChats && newMessage) {
      let params = `telegram_id=${selChats.telegram_id}&brand=${selChats.brand}&message=%3Cb%3E${window?.frappe?.full_name}%3C%2Fb%3E%3A%0A${newMessage}%0A&cmd=mahadev.mahadev.func.send_message`;
      let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
      if (data) {
        setNewMessage('')
      }
    }
  }

  const closeCurrentChart = () => {
    if (window.confirm('Are you sure to remove ?') == true) {
      delete brandWiseChats.current[selBrand.current][selChats.name]
      delete tempMessagesIds.current[selChats.name]
      selectBrand(selBrand.current)
    }
  }

  const updateTime = () => {
    $('.tab-time').toArray().forEach(e => {
      let tab_time = $(e);
      let timestamp = parseInt(tab_time.attr('timestamp'));
      let time_str_new = new Date(timestamp * 1000).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true })
      if (timestamp) {
        let time_str = time_ago(timestamp);
        tab_time.text(time_str);
        tab_time.attr('title', time_str);
      }
    });
  }

  const updateLive = async () => {
    setLive(!live)
    if (selChats) {
      let params = `doctype=Conversation+Log&name=${selChats.current_conversation}&fieldname=%7B%22live%22%3A${!live}%7D&cmd=frappe.client.set_value`;
      let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
      if (data.message) {
        // console.log(data.message)
      }
    }
  }

  const playSound = (msgBrand) => {
    let url = '';
    if (msgBrand == 'JitoDaily') {
      url = 'https://teams.jitodaily.com/files/LiveChatForJD.mp3'
    } else if (msgBrand == 'agbook') {
      url = 'https://teams.jitodaily.com/files/LiveChatForAG.mp3';
    } else if (msgBrand == 'LionBook') {
      url = 'https://teams.jitodaily.com/files/LiveChatForLB.mp3';
    } else if (msgBrand == 'LotusExch') {
      url = 'https://teams.jitodaily.com/files/LiveChatForLE.mp3';
    }
    let a = new Audio(url);
    a.play();
  }

  return (
    <div className="containers">

      <div className="topFilter">
        <div className="row no-gutters">

          <div className="col-md-2">
            <div className="alproces filterBox">
              <div className="box all">All</div>
              <div className="box process">In-Process</div>
              <div className="clearfix"></div>
              <div className="box live">Live</div>
              <div className="box fail">Failed</div>
            </div>
          </div>

          <div className="col-md-1">
            <div className="filterBox">

              <div className="btn-group">
                <button className="btn btn-sm dropdown-toggle btn-primary" type="button"
                  data-toggle="dropdown" aria-expanded="false">
                  {recentVal.label}
                </button>
                <div className="dropdown-menu">
                  {recentTabOptions.map((item, key) => <div key={key} className='dropdown-item recentTab' onClick={() => { recent.current = item; setRecentVal(item); filterChats() }}>{item.label}</div>)}
                </div>
              </div>


              <div className="btn-group">
                <button className="btn btn-sm dropdown-toggle btn-success" type="button"
                  data-toggle="dropdown" aria-expanded="false">
                  {stateVal.label}
                </button>
                <div className="dropdown-menu">
                  {stateTabOptions.map((item, key) => <div key={key} className='dropdown-item stateTab' onClick={() => { state.current = item; setStateVal(item); filterChats() }}>{item.label}</div>)}
                </div>
              </div>

            </div>
          </div>

          <div className="col-md-9">
            <div className="liveMatchScroll">
              {Object.keys(brands).map((item, key) => <div key={key} onClick={() => selectBrand(item)} className={item == selBrand.current ? 'liveMatch active' : 'liveMatch'}>
                <ul className="alproces">
                  <li className="title">{item}</li>
                  <li className="live"><span>{brands[item].live}</span></li>
                </ul>
                <ul className="alproces count">
                  <li className={"all filterTab " + ((item == selBrand.current && selChatType.current === 'all') ? 'filterTab-focus' : '')} onClick={() => { selChatType.current = 'all'; filterChats() }}>
                    <span>{brands[item].all}</span>
                  </li>
                  <li className={"process filterTab " + ((item == selBrand.current && selChatType.current === 'process') ? 'filterTab-focus' : '')} onClick={() => { selChatType.current = 'process'; filterChats() }}>
                    <span>{brands[item].process}</span>
                  </li>
                  <li className={"live filterTab " + ((item == selBrand.current && selChatType.current === 'live') ? 'filterTab-focus' : '')} onClick={() => { selChatType.current = 'live'; filterChats() }}>
                    <span>{brands[item].live}</span>
                  </li>
                  <li className={"fail filterTab " + ((item == selBrand.current && selChatType.current === 'fail') ? 'filterTab-focus' : '')} onClick={() => { selChatType.current = 'fail'; filterChats() }}>
                    <span>{brands[item].fail}</span>
                  </li>
                </ul>
              </div>)}
            </div>
          </div>
        </div>
      </div>


      <div className="row no-gutters">
        <div className="col-md-4 border-right">
          <div className="settings-tray">
            <div className="friend-drawer no-gutters friend-drawer--grey">
              <img className="profile-image" src={`https://ui-avatars.com/api/?name=${selBrand.current}`} alt="" />
              <div className="text">
                <h6>{selBrand.current}</h6>
              </div>
            </div>
          </div>

          <div className="search-box">
            <div className="input-wrapper">
              <i className="fa fa-search form-control-feedback"></i>
              <input placeholder="Search here" type="text" value={search} onChange={(event) => {
                setSearch(event.target.value)
                filterChats(event.target.value)
              }
              } />
            </div>
          </div>

          <div className="leftMenu" id="chatBox">
            {currentChats.map((chats, key) => {
              if (chats) {
                let _live = parseInt(chats.live) ? '<span style="color: red;">LIVE</span>' : ' ';
                let full_name = `${chats.first_name || ''} ${chats.last_name || ''}`.trim();
                let _tab_identifier = `${chats.mobile_number} ${chats.telegram_username ? '(@' + chats.telegram_username + ')' : ''} - ${full_name}`;
                let timestamp = parseInt(chats?.last_seen) * 1000 || 0;
                let _tab_msg = `${parseInt(chats?.last_msg?.sender) ? 'Bot' : 'User'}: ${chats?.last_msg?.content || 'New Chat'}`;
                let _tab_time = timestamp ? time_ago(timestamp) : '';
                let isImg = _tab_msg.split(':\nIMG:')
                return <div key={key} id={chats.name} className={"friend-drawer friend-drawer--onhover "} onClick={() => selectChat(chats)}>
                  <img className="profile-image" src={`https://ui-avatars.com/api/?name=${chats.first_name + ' ' + chats.last_name}`} alt="" />
                  <div className="text">
                    <h6 className="message-head" dangerouslySetInnerHTML={{ __html: _live + ' ' + _tab_identifier }}></h6>
                    {isImg[1] ? <><div className="message-text" style={{ display: 'inline' }} dangerouslySetInnerHTML={{ __html: isImg[0] }} /> <img width={15} src={isImg[1]} alt="" /></> : <div className="message-text" dangerouslySetInnerHTML={{ __html: _tab_msg }} />}
                  </div>
                  <div className="message-count"> {chats.messages?.length} </div>
                  <span className="time text-muted small message-time tab-time text-overflow" timestamp={timestamp} title={_tab_time}>{_tab_time}</span>
                </div>
              }
            }
            )}
          </div>

        </div>
        <div className="col-md-8">
          <div className="settings-tray">
            {/* {selChats && (<div className="closeChart"><i onClick={closeCurrentChart} className="fa fa-times" aria-hidden="true"></i></div>)} */}
            <div className="friend-drawer no-gutters friend-drawer--grey">
              <img className="profile-image" src={`https://ui-avatars.com/api/?name=${selChats?.first_name + ' ' + selChats?.last_name}`} alt="" />
              <div className="text">
                <h6>{selChats?.mobile_number}</h6>
                <p className="text-muted">Last seen: {selChats?.time_str}</p>
              </div>
            </div>
          </div>
          <div className="chat-panel">
            <div className="chatMenu">
              <div className="load-messages" data-toggle="tooltip" title="Load Previous Messages" onClick={loadPrevConversation}><i className="fa fa-refresh" aria-hidden="true"></i></div>
              {messages.map((item, key) => {
                let state = String(item.state || '')
                let color = state.includes('_success') ? '#16c78452' : state.includes('_failed') ? '#d0353e52' : 'white';
                let conversation_id = item.name
                let date_str = new Date(item.timestamp * 1000).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true })
                let isImg = item.content.split(':\nIMG:')
                return <div key={key} className={"row no-gutters" + conversation_id} style={{ backgroundColor: color }}>
                  <div className={parseInt(item.sender) ? 'col-md-7 offset-md-5' : 'col-md-7 '}>
                    <div className={parseInt(item.sender) ? 'chat-bubble chat-bubble--right' : 'chat-bubble chat-bubble--left'}>
                      {isImg[1] ? <><div style={{ display: 'inline' }} dangerouslySetInnerHTML={{ __html: isImg[0] }} /> <img width={40} src={isImg[1]} alt="" /></> : <div dangerouslySetInnerHTML={{ __html: item.content }} />}
                      <h5><i className="fa fa-clock-o"></i> {date_str} </h5>
                    </div>
                  </div>
                </div>
              })}
              <div ref={chatMenuRef} />
            </div>

            <div className="row">
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <div className="col-12">
                  <div className="chat-box-tray autocomplete">
                    <input type="checkbox" name="liveCheck" checked={live} value="live" onChange={updateLive} />
                    <Emoji enableTxt={addEmoji} />
                    <input ref={messageRef} type="text" placeholder="Type your message here..." value={newMessage} onChange={(event) => addMessage(event.target.value)} />
                    <i onClick={handleSubmit} className="fa fa-paper-plane" aria-hidden="true"></i>
                    <label className="upload-file">
                      <input type="file" onChange={uploadFile} />
                      <i className="fa fa-paperclip"></i>
                    </label>
                    {selTemplate.length > 0 && (<div className="autocomplete-items">
                      {selTemplate.map((item, key) => <div key={key} onClick={() => addTemplate(item)}>{item.name}</div>)}
                    </div>)}
                    <i className="fa fa-microphone" aria-hidden="true"></i>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chats;
