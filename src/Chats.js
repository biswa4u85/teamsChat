import React, { useRef, useState, useEffect } from "react";
import $ from 'jquery';
import { parse_msgs, time_ago } from './Utils'
import { apiPostCall } from './services/site-apis'
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
  const chatMenuRef = useRef();
  const messageRef = useRef();
  let brandWiseChats = useRef({});
  let selBrand = useRef(null);
  const [brands, setBrands] = useState({})
  const [currentChats, setCurrentChats] = useState({})
  let recent = useRef(recentTabOptions[1]);
  let state = useRef(stateTabOptions[0]);
  let selChatType = useRef('live');
  const [templates, setTemplates] = useState([])
  let timer = useRef(null);
  const [selTemplate, setSelTemplate] = useState([])
  const [search, setSearch] = useState('')
  const [selChats, setSelChats] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [live, setLive] = useState(false)

  useEffect(() => {
    getChats(null)
    window?.frappe?.socketio.init(9000);
    window?.frappe?.socketio.socket.on("send_message", recvMessage);
    window?.frappe?.socketio.socket.on("send_chat", recvChat);
    setInterval(() => {
      getChats(5)
      updateTime(5)
    }, 1000)
  }, []);


  const getChats = async (qty) => {
    let params = `cmd=mahadev.mahadev.doctype.conversation_log.conversation_log.get_conversationsnew`;
    if (qty) {
      params = `interval=5&cmd=mahadev.mahadev.doctype.conversation_log.conversation_log.get_conversationsnew`;
    }
    let data = await apiPostCall('/', params)
    if (data.message) {
      randerBrandWiseChats(data.message, (qty ? false : true))
    }
  }

  const loadPrevConversation = async () => {
    if (selChats) {
      let params = `doctype=Conversation+Log&name=${selChats.previous_conversation}&cmd=frappe.client.get`;
      let data = await apiPostCall('/', params)
      if (data.message) {
        data.message.messages = parse_msgs(data.message.messages);
        let tempMessages = JSON.parse(JSON.stringify(messages))
        let newMessages = [...data.message.messages, ...tempMessages]
        setMessages(newMessages)
      }
    }
  }

  const recvMessage = (data) => {
    console.log('aa ', data)
  }

  const recvChat = (data) => {
    console.log('bb ', data)
  }

  const randerBrandWiseChats = (data, brand = null) => {
    let tempOldData = JSON.parse(JSON.stringify(brandWiseChats.current))

    // Make last msg
    for (let item of data) {
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
    setBrands(allBrands)
    brandWiseChats.current = tempOldData
    if (brand) {
      selectBrand(Object.keys(allBrands)[0])
    }
    filterChats()
  }

  const selectBrand = (data) => {
    selBrand.current = data
    filterChats()
    setSelTemplate([])
    getTemplate(data)
  }

  const getTemplate = async (name) => {
    let params = `doctype=Chat+Template&filters=%7B%22brand%22%3A%22${name}%22%7D&limit_page_length=None&fields=%5B%22name%22%2C%22brand%22%2C%22template_message%22%5D&cmd=frappe.client.get_list`;
    let data = await apiPostCall('/', params)
    if (data.message) {
      setTemplates(data.message)
    }
  }

  const filterChats = (search = null) => {

    let currentChats = {}
    if (selBrand.current) {
      currentChats = brandWiseChats.current[selBrand.current]
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

    let filterChats = JSON.parse(JSON.stringify(currentChats))

    for (let c in filterChats) {

      // Live Filter
      if (selChatType.current == 'live' && !live_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (selChatType.current == 'notLive' && !not_live_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (selChatType.current == 'success' && !success_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (selChatType.current == 'process' && !process_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (selChatType.current == 'failed' && !failed_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");

      // Recent Filter
      if (recent.current.value == '1' && !recent_1_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (recent.current.value == '7' && !recent_7_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (recent.current.value == '30' && !recent_30_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (recent.current.value == '365' && !recent_365_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");

      // State Filter  
      if (state.current.value == 'account' && !account_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (state.current.value == 'deposit' && !deposit_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (state.current.value == 'withdraw' && !withdraw_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
      else if (state.current.value == 'blocked' && !blocked_chats.includes(c))
        $(`#${filterChats[c].name}`).addClass("tab-hidden");
    }

    // Search Value
    if (search) {
      for (let c in filterChats) {
        let data_str = `${filterChats[c].first_name} ${filterChats[c].last_name} ${filterChats[c].telegram_username} ${filterChats[c].state} ${filterChats[c].current_conversation} ${filterChats[c].mobile_number}`.toLowerCase();
        if (!data_str.includes((search).toLowerCase())) {
          $(`#${filterChats[c].name}`).addClass("tab-hidden");
        }
      }
    }
    setCurrentChats(filterChats)
  }

  const selectChat = (data) => {
    $('.leftMenu').each(function () {
      $(this).find('.friend-drawer').removeClass('tab-focus');
    });
    $(`#${data.name}`).addClass("tab-focus");
    data['time_str'] = new Date(data.last_msg.timestamp * 1000).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true })
    setSelChats(data)
    setMessages(data.messages)
    setNewMessage('')
    chatMenuRef.current.scrollIntoView({ behavior: "smooth" });
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
    }
    if (selChats) {
      setNewMessage(data)
      messageRef.current.focus()
    }
  }

  const uploadFile = (elem) => {
    // var filename = $(elem).val();
    console.log(elem.fi)
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newMessage) {
      let params = `telegram_id=${selChats.telegram_id}&brand=${selChats.brand}&message=%3Cb%3E${window?.frappe?.full_name}%3C%2Fb%3E%3A%0A${newMessage}%0A&cmd=mahadev.mahadev.func.send_message`;
      let data = await apiPostCall('/', params)
      if (data) {
        setNewMessage('')
      }
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
      let data = await apiPostCall('/', params)
      if (data.message) {
        // console.log(data.message)
      }
    }
  }

  const playSound = (msgBrand, state) => {
    let url = '';
    if (msgBrand == 'JitoDaily') {
      if (state == 'live_chat_start') url = 'https://teams.jitodaily.com/files/LiveChatForJD.mp3';
      if (state == 'live_chat_message_state') url = 'https://teams.jitodaily.com/files/JdAlert.mp3';
    } else if (msgBrand == 'agbook') {
      if (state == 'live_chat_start') url = 'https://teams.jitodaily.com/files/LiveChatForAG.mp3';
      if (state == 'live_chat_message_state') url = 'https://teams.jitodaily.com/files/AgAlert.mp3';
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
                  {recent.current.label}
                </button>
                <div className="dropdown-menu">
                  {recentTabOptions.map((item, key) => <div key={key} className='dropdown-item recentTab' onClick={() => { recent.current = item; filterChats() }}>{item.label}</div>)}
                </div>
              </div>


              <div className="btn-group">
                <button className="btn btn-sm dropdown-toggle btn-success" type="button"
                  data-toggle="dropdown" aria-expanded="false">
                  {state.current.label}
                </button>
                <div className="dropdown-menu">
                  {stateTabOptions.map((item, key) => <div key={key} className='dropdown-item stateTab' onClick={() => { state.current = item; filterChats() }}>{item.label}</div>)}
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

          <div className="leftMenu">
            {Object.keys(currentChats).map((item, key) => {
              let chats = currentChats[item]
              let _live = parseInt(chats.last_msg.live) ? '<span style="color: red;">LIVE</span>' : '';
              let full_name = `${chats.first_name || ''} ${chats.last_name || ''}`.trim();
              let _tab_identifier = `${chats.mobile_number} ${chats.telegram_username ? '(@' + chats.telegram_username + ')' : ''} - ${full_name}`;
              let timestamp = parseInt(chats.last_msg.timestamp) * 1000 || 0;
              let _tab_msg = `${parseInt(chats.last_msg.sender) ? 'Bot' : 'User'}: ${chats.last_msg.content || 'New Chat'}`;
              let _tab_time = timestamp ? time_ago(timestamp) : '';
              return <div key={key} id={chats.name} className={"friend-drawer friend-drawer--onhover "} onClick={() => selectChat(chats)}>
                <img className="profile-image" src={`https://ui-avatars.com/api/?name=${chats.first_name + ' ' + chats.last_name}`} alt="" />
                <div className="text">
                  <h6>{_live} {_tab_identifier}</h6>
                  <p className="text-muted" dangerouslySetInnerHTML={{ __html: _tab_msg }} />
                </div>
                <div className="message-count"> {chats.messages?.length} </div>
                <span className="time text-muted small message-time tab-time text-overflow" timestamp={timestamp} title={_tab_time}>{_tab_time}</span>
              </div>
            }
            )}
          </div>

        </div>
        <div className="col-md-8">
          <div className="settings-tray">
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
                return <div key={key} className={"row no-gutters" + conversation_id} style={{ backgroundColor: color }}>
                  <div className={parseInt(item.sender) ? 'col-md-7 offset-md-5' : 'col-md-7 '}>
                    <div className={parseInt(item.sender) ? 'chat-bubble chat-bubble--right' : 'chat-bubble chat-bubble--left'}>
                      <div dangerouslySetInnerHTML={{ __html: item.content }} />
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
                    <input type="checkbox" name="liveCheck" checked={live} value="live" onClick={updateLive} />
                    <Emoji enableTxt={addEmoji} />
                    <input ref={messageRef} type="text" placeholder="Type your message here..." value={newMessage} onChange={(event) => addMessage(event.target.value)} />
                    <label className="upload-file">
                      <input type="file" onChange={uploadFile} />
                      <i className="fa fa-paperclip"></i>
                    </label>
                    {selTemplate.length > 0 && (<div className="autocomplete-items">
                      {selTemplate.map((item, key) => <div key={key} onClick={() => addTemplate(item)}>{item.name}</div>)}
                    </div>)}
                    <i className="fa fa-microphone" aria-hidden="true"></i>
                    <i onClick={handleSubmit} className="fa fa-paper-plane" aria-hidden="true"></i>
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
