import React, { useRef, useState, useEffect } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import $ from 'jquery';
import moment from 'moment';
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
  const [users, setUsers] = useState([])
  const [blockDetails, setBlockDetails] = useState(null)
  const [user, setUser] = useState(null)
  let timer = useRef(null);
  let timerDate = useRef(null);
  const [selTemplate, setSelTemplate] = useState([])
  const [search, setSearch] = useState('')
  let selChatsLive = useRef({});
  const [selChats, setSelChats] = useState(null)
  let messagesLive = useRef({});
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [live, setLive] = useState(false)
  const [checkSubmit, setCheckSubmit] = useState(true)
  const [recording, setRecording] = useState(false)
  const { startRecording, stopRecording, pauseRecording, resumeRecording, status, mediaBlobUrl, clearBlobUrl } = useReactMediaRecorder(
    {
      audio: true,
      blobPropertyBag: { type: "audio/mpeg" },
    }
  );

  useEffect(() => {
    async function uploadVoice() {
      if (selChats) {
        const audioBlob = await fetch(mediaBlobUrl).then((r) => r.blob());
        const file = new File([audioBlob], "audiofile.mp3", {
          type: "audio/mpeg",
        });
        let data = await fileUpload(file, window?.frappe?.csrf_token)
        if (data.message) {
          let file = `${Config.apiURL}${data.message.file_url}`
          let params = `chat_id=${selChats.telegram_id}&brand=${selChats.brand}&voice=${file}&message=%3Cb%3E${window?.frappe?.full_name}%3C%2Fb%3E%3A%0A%0A&cmd=mahadev.mahadev.func.send_message`;
          let data1 = await apiPostCall('/', params, window?.frappe?.csrf_token)
          if (data1) {
            setNewMessage('')
            clearBlobUrl()
          }
        }
      }
    }
    if (mediaBlobUrl && recording) {
      uploadVoice();
      setRecording(false)
    }

  }, [mediaBlobUrl]);



  useEffect(() => {

    if (window?.frappe?.csrf_token == 'None') {
      window.location.replace(`${window.location.origin}/login`)
    }

    setTimeout(() => getChats(null), 50)
    window?.frappe?.socketio.init(9000);
    window?.frappe?.socketio.socket.on("send_message", recvMessage);
    addtimerDate()
    setInterval(() => {
      // recvMessage(`{\"mobile_number\": \"MN-0001947\", \"brand\": \"JitoDaily\", \"conversation\": \"CONV-1667912821959\", \"state\": \"\", \"message_id\": 1205937, \"sender\": 1, \"message_type\": 0, \"message\": \"<b>Biswa Sahoo</b>:\\nhi\\n\", \"media\": [\"\"], \"timestamp\": \"1667917183\", \"live\": 0} `)
    }, 1000)
  }, []);

  const addtimerDate = () => {
    timerDate.current = setInterval(() => {
      updateTime()
    }, 1000)
  }


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
    if (selChats && selChats.previous_conversation) {
      let params = `doctype=Conversation+Log&name=${selChats.previous_conversation}&cmd=frappe.client.get`;
      let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
      if (data.message) {
        data.message.messages = parse_msgs(data.message.messages);
        let tempMessages = JSON.parse(JSON.stringify(messages))
        let newMessages = [...data.message.messages, ...tempMessages]
        messagesLive.current = newMessages
        setMessages(newMessages)
        let tempSelChats = selChats
        tempSelChats.previous_conversation = data.message.previous_conversation
        setSelChats(tempSelChats)
      }
    }
  }

  const recvMessage = (msg) => {
    let data = JSON.parse(msg);
    if (data && (data.message || data.media)) {
      clearInterval(timerDate.current)
      data.message = data?.message ? decodeURIComponent(data.message) : ' ';
      data.media = data?.media ? decodeURIComponent(data.media) : ' ';

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
          // newData.last_seen = Math.floor(Date.now() / 1000)
          newData.live = data.live
          newData.state = data.state;
          newData.last_msg = data;
          newData.liveStarted = (data.message).includes('Live Chat started') ? true : false
          brandWiseChats.current[data.brand][data.mobile_number] = newData
          if (data.brand == selBrand.current) {
            let _live = parseInt(newData.live) ? '<span style="color: red;">LIVE</span>' : '';
            let full_name = `${newData.first_name || ''} ${newData.last_name || ''}`.trim();
            let _tab_identifier = `${newData.mobile_number} ${newData.telegram_username ? '(@' + newData.telegram_username + ')' : ''} - ${full_name}`;
            let _tab_msg = `${parseInt(newData?.last_msg?.sender) ? 'Bot' : 'User'}: ${newData?.last_msg?.message || 'New Chat'}`;
            let timestamp = parseInt(newData?.last_seen) * 1000 || 0;
            let _tab_time = timestamp ? time_ago(timestamp) : '';
            $(`#${data.mobile_number} .message-time`).text(_tab_time);
            $(`#${data.mobile_number} .message-time`).attr("timestamp", timestamp);
            $(`#${data.mobile_number} .message-count`).text(newData?.message?.length);
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
      addtimerDate()
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
      // return new Date(b.last_seen) - new Date(a.last_seen);
      return Number(b.last_seen) - Number(a.last_seen);
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
      clearInterval(timerDate.current)
      let currentChats = JSON.parse(JSON.stringify(brandWiseChats.current[selBrand.current]))
      let sortable = Object.values(currentChats)
      sortable = sortable.sort(function (a, b) {
        // return new Date(b.last_seen) - new Date(a.last_seen);
        return Number(b.last_seen) - Number(a.last_seen);
      });
      setCurrentChats(JSON.parse(JSON.stringify(sortable)))
      addtimerDate()
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
    clearInterval(timerDate.current)
    selBrand.current = data
    let currentChats = JSON.parse(JSON.stringify(brandWiseChats.current[data]))
    let sortable = Object.values(currentChats)
    sortable = sortable.sort(function (a, b) {
      // return new Date(b.last_seen) - new Date(a.last_seen);
      return Number(b.last_seen) - Number(a.last_seen);
    });
    setCurrentChats([])
    setTimeout(() => {
      setCurrentChats(JSON.parse(JSON.stringify(sortable)))
      setSelTemplate([])
      getTemplate(data)
      messagesLive.current = []
      setMessages([])
      filterChats()
      addtimerDate()
    }, 5)

  }

  const getTemplate = async (name) => {
    let params = `doctype=Chat+Template&filters=%7B%22brand%22%3A%22${name}%22%7D&limit_page_length=None&fields=%5B%22name%22%2C%22brand%22%2C%22template_message%22%5D&cmd=frappe.client.get_list`;
    let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
    if (data.message) {
      setTemplates(data.message)
    }
  }

  const getAllusers = async (item) => {
    let paramsUserMobile = `doctype=Mobile+Number&filters=%7B%22name%22%3A%22${item.mobile_number}%22%7D&limit_page_length=None&fields=%5B%22name%22%2C%22blocked_until%22%2C%22total_lock_reason%22%5D&cmd=frappe.client.get_list`;
    let dataUserMobile = await apiPostCall('/', paramsUserMobile, window?.frappe?.csrf_token)
    if (dataUserMobile.message) {
      setBlockDetails(dataUserMobile?.message ? dataUserMobile?.message[0] : null)
    }

    let params = `doctype=Sports+Website+User&filters=%7B%22mobile_number%22%3A%22${item.name}%22%7D&limit_page_length=None&fields=%5B%22name%22%2C%22username%22%2C%22sports_website%22%5D&cmd=frappe.client.get_list`;
    let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
    if (data.message) {
      setUsers(data.message)
      setUser(null)
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

  const selectChat = async (item) => {
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
    setUsers([])
    setBlockDetails(null)
    getAllusers(item)
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
    if (checkTemplate[1] && checkTemplate[1] != '') {
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
      let fileType = (event.target.files[0].type).split("/");
      let fileFormat = fileType[0]
      let fileName = 'document'
      if (fileFormat === 'video') {
        fileName = 'video'
      }
      if (fileFormat === 'image') {
        fileName = 'photo'
      }
      let data = await fileUpload(event.target.files[0], window?.frappe?.csrf_token)
      if (data.message) {
        let file = `${Config.apiURL}${data.message.file_url}`
        let params = `chat_id=${selChats.telegram_id}&brand=${selChats.brand}&${fileName}=${file}&message=%3Cb%3E${window?.frappe?.full_name}%3C%2Fb%3E%3A%0A%0A&cmd=mahadev.mahadev.func.send_message`;
        let data1 = await apiPostCall('/', params, window?.frappe?.csrf_token)
        if (data1) {
          setNewMessage('')
        }
      }
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selChats && newMessage && checkSubmit) {
      setCheckSubmit(false)
      let params = `chat_id=${selChats.telegram_id}&brand=${selChats.brand}&message=%3Cb%3E${window?.frappe?.full_name}%3C%2Fb%3E%3A%0A${newMessage}%0A&cmd=mahadev.mahadev.func.send_message`;
      let data = await apiPostCall('/', params, window?.frappe?.csrf_token)
      if (data) {
        setNewMessage('')
        setCheckSubmit(true)
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
      if (timestamp) {
        let time_str = time_ago(timestamp);
        tab_time.text(time_str);
      }
    });
  }

  const updateLive = async () => {
    setLive(!live)
    if (selChats && selChats.live) {
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
                let _tab_msg = `${parseInt(chats?.last_msg?.sender) ? 'Bot' : 'User'}: ${chats?.last_msg?.message || 'New Chat'}`;
                let _tab_time = timestamp ? time_ago(timestamp) : '';
                let isImg = _tab_msg.split(':\nIMG:')
                return <div key={key} id={chats.name} className={"friend-drawer friend-drawer--onhover "} onClick={() => selectChat(chats)}>
                  <img className="profile-image" src={`https://ui-avatars.com/api/?name=${chats.first_name + ' ' + chats.last_name}`} alt="" />
                  <div className="text">
                    <h6 className="message-head" dangerouslySetInnerHTML={{ __html: _live + ' ' + _tab_identifier }}></h6>
                    {isImg[1] ? <><div className="message-text" style={{ display: 'inline' }} dangerouslySetInnerHTML={{ __html: isImg[0] }} /> <img width={15} src={isImg[1]} alt="" /></> : <div className="message-text" dangerouslySetInnerHTML={{ __html: _tab_msg }} />}
                  </div>
                  <div className="message-count"> {chats.messages?.length} </div>
                  <span className="time text-muted small message-time tab-time text-overflow" timestamp={timestamp}>{_tab_time}</span>
                </div>
              }
            }
            )}
          </div>

        </div>
        <div className="col-md-8">
          <div className="settings-tray">
            {/* {selChats && (<div className="closeChart"><i onClick={closeCurrentChart} className="fa fa-times" aria-hidden="true"></i></div>)} */}
            {selChats && (<div className="closeChart">
              {blockDetails?.blocked_until ? <span onClick={() => window.open(`${window.location.origin}/app/mobile-number/${blockDetails.name}`, '_blank')} className="banDate"><i className="fa fa-ban" aria-hidden="true"></i> {moment(blockDetails?.blocked_until).format('YYYY-MM-DD HH:mm')}</span> : ''}
              <select name="user" id="user" onChange={(obj) => setUser(obj.target.value)}>
                <option value={null}>Select User</option>
                {users.map((user, key) => <option key={key} value={user.name}>{user.username}</option>)}
              </select>
              <i onClick={() => {
                let selUser = users.find((item) => item.name = user)
                if (selUser) {
                  window.open(`${window.location.origin}/api/method/mahadev.mahadev.doctype.sports_website.sports_website.get_statement?site=${selUser.sports_website}&username=${selUser.username}&statement_type=2&days=3`, '_blank')
                }
              }} className="fa fa-download" aria-hidden="true"></i>
            </div>)}
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
                // console.log(item)
                let state = String(selChats.state || '')
                let color = state.includes('_success') ? '#16c78452' : state.includes('_failed') ? '#d0353e52' : 'white';
                let conversation_id = item.name
                let date_str = new Date(item.timestamp * 1000).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true })
                return <div key={key} className={"row no-gutters" + conversation_id} style={{ backgroundColor: color }}>
                  <div className={parseInt(item.sender) ? 'col-md-7 offset-md-5' : 'col-md-7 '}>
                    <div className={((item.message_type == 0 || item.message_type == 1) ? 'chat-bubble ' : 'chat-bubble bg-none ') + (parseInt(item.sender) ? 'chat-bubble--right' : 'chat-bubble--left')}>
                      {(item.message_type == 0 || item.message_type == 1) && (<div className={item.message_type == 1 ? "boxShadow" : "box"} dangerouslySetInnerHTML={{ __html: item.message }} />)}
                      {!(item.message_type == 0 || item.message_type == 1) && (<div className="heading"><span dangerouslySetInnerHTML={{ __html: item.message ? item.message : ' ' }} /><span><i className="fa fa-clock-o"></i> {date_str}</span></div>)}
                      {item.message_type == 2 && (<img width="100%" src={(item.sender == 0 ? Config.apiURL : '') + item.media} />)}
                      {item.message_type == 3 && (<video width="100%" controls>
                        <source src={(item.sender == 0 ? Config.apiURL : '') + item.media} type="video/mp4" />
                        <source src={(item.sender == 0 ? Config.apiURL : '') + item.media} type="video/ogg" />
                        Your browser does not support HTML video.
                      </video>)}
                      {item.message_type == 4 && (<video width="100%" height="50" controls>
                        <source src={(item.sender == 0 ? Config.apiURL : '') + item.media} type="audio/mp3" />
                        <source src={(item.sender == 0 ? Config.apiURL : '') + item.media} type="audio/ogg" />
                        Your browser does not support HTML video.
                      </video>)}
                      {item.message_type == 5 && (<a style={{ backgroundColor: '#ccc', display: 'block', padding: 4, color: '#fff' }} target={'_blank'} href={(item.sender == 0 ? Config.apiURL : '') + item.media}>PDF DOWNLOAD</a>)}
                      {(item.message_type == 0 || item.message_type == 1) && (<h5><i className="fa fa-clock-o"></i> {date_str} </h5>)}
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

                    {(status == 'idle' || status == 'stopped') && (<i className="fa fa-microphone" onClick={() => {
                      setRecording(true)
                      clearBlobUrl()
                      startRecording()
                    }}></i>)}
                    {!(status == 'idle' || status == 'stopped') && (<i className="fa fa-play-circle" style={{ color: 'green' }} onClick={() => {
                      stopRecording()
                    }}></i>)}
                    {!(status == 'idle' || status == 'stopped') && (<div className="autocomplete-audio">
                      <div className="audioBox">
                        <i className="fa fa-trash" onClick={() => {
                          clearBlobUrl()
                          setRecording(false)
                        }} aria-hidden="true"></i>
                        {status != 'paused' && (<div><img className="audio-image" src={`${Config.apiURL}/files/audio.gif`} alt="" /></div>)}
                        {status != 'paused' && (<i className="fa fa-pause" style={{ color: '#ff0000' }} onClick={pauseRecording} aria-hidden="true"></i>)}
                        {status == 'paused' && (<i className="fa fa-microphone" style={{ color: '#ff0000' }} onClick={resumeRecording} aria-hidden="true"></i>)}
                      </div>
                    </div>)}
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