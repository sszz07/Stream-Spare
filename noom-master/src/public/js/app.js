const socket = io();//자동으로 백엔드에 있는 소켓 io를 찾아서 연결을 해준다

const videoGrid = document.getElementById("video-grid");
const audioBtn = document.getElementById("muteButton");
const cameraBtn = document.getElementById("playPauseVideo");
const leaveBtn = document.getElementById("leave-meeting");
const waitRoom = document.getElementById("waitRoom");
const waitRoomForm = waitRoom.querySelector("form");

const modal = document.getElementById("modal");
const modalForm = modal.querySelector("form");
const btnOpenModal = document.querySelector('.make_room');
const make_cancel = document.querySelector('.make_cancel');

const modal_image = document.getElementById('modal_image');
const modal_image_Form = modal_image.querySelector("form");
const image_cancel = document.querySelector('.image_cancel');
const send_image = document.querySelector('.send_image');


const callRoom = document.getElementById("callRoom");
const make_room = document.getElementById("make_room");


const chatting_list = document.getElementById("chatting_list");
const chatForm = document.getElementById("chatForm");
const display_container = document.getElementById("display-container");


// 처음에 화면에 보이지 않음
callRoom.style.display = "none";

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let nickname;

let hTagCount = 0;
let peer_nick_array = [];

let myPeerConnection_list = {};
let myDataChannel = {};

const DEFAULT_HEIGHT = 5; // textarea 기본 height
const $textarea = document.querySelector('#textarea');
var result;
var image;
var image_null = "없음";
/*
* A의 입장
1.RTCPeerConnection 인스턴스 생성ㅇ
2.RTCPeerConnection.createOffer()를 이용해서 sdp 만듬
3.RTCPeerConnection.setLocalDescription() 로컬 sdp 설정
4.상대방에게 만든 offer값을 전송
5.RTCPeerConnection에서 icecandidate 이벤트의 리스너를 등록
6.icecandidate 이벤트마다 (신호 서비스 사용) 원격 피어에 이벤트를 전송
7.상대방에게 받은 sdp를 RTCPeerConnection.setRemoteDescription()를 사용하여 설정
8.수신 원격 ICE 후보를 대기하고 RTCPeerConnection.addIceCandidate()를 사용하여 추가
* */


//카메라 음성 정보 가져오기
async function getMedia() {
    try {
        myStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });

        let my_peerVideo = document.createElement('video');
        my_peerVideo.setAttribute('class', 'video');
        my_peerVideo.setAttribute('autoplay', '');
        my_peerVideo.setAttribute('width', "300");
        my_peerVideo.setAttribute('height', "300");
        videoGrid.appendChild(my_peerVideo);
        my_peerVideo.srcObject = myStream;

        await getCamera();
    } catch (e) {

    }
}


function handleAudioClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if (!muted) {
        audioBtn.innerText = "음성 on";
    } else {
        audioBtn.innerText = "음성 off";
    }
    muted = !muted;
}

function room_leave() {
    var answer = confirm('종료 하시겠습니까?');
    if (!answer) {
    } else if (answer) {
        socket.emit("set_nickname", nickname, null, "삭제");
        location.reload(true);
    }
}


function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (!cameraOff) {
        cameraBtn.innerText = "카메라 on";
    } else {
        cameraBtn.innerText = "카메라 off";
    }
    cameraOff = !cameraOff;
}


audioBtn.addEventListener("click", handleAudioClick);
cameraBtn.addEventListener("click", handleCameraClick);
leaveBtn.addEventListener("click", room_leave);
// --------------- wait room form (choose and enter a room) -----------------


//닉네임과 방이름을 입력했을때
function showRoom() {
    waitRoom.style.display = "none";
    make_room.style.display = "none";
    callRoom.hidden = false;
    callRoom.style.display = "flex";
    modal.style.display = "none";
}

//방 입장하기
async function handleRoomSubmit(e) {
    e.preventDefault();

    // 카메라, 마이크 장치 연결 설정
    //peerconnections 만드는 메소드

    // 닉네임 설정
    const nicknameInput = waitRoom.querySelector("#nickname");


    // 채팅방 입장
    const roomNameInput = waitRoom.querySelector("#roomName");
    socket.emit("set_nickname", nicknameInput.value, roomNameInput.value, null);

    roomName = roomNameInput.value;
    nickname = nicknameInput.value;


    nicknameInput.value = null;
    roomNameInput.value = null;
    waitRoomForm.reset();
}

waitRoomForm.addEventListener("submit", handleRoomSubmit);


async function makeRoomSubmit(e) {
    e.preventDefault();

    // 카메라, 마이크 장치 연결 설정
    //peerconnections 만드는 메소드


    // 닉네임 설정
    const nicknameInput = modal.querySelector("#nickname");

    // 채팅방 입장
    const roomNameInput = modal.querySelector("#roomName");
    socket.emit("enter_room", "방만들기", roomNameInput.value, nicknameInput.value);

    roomName = roomNameInput.value;
    nickname = nicknameInput.value;

    nicknameInput.value = null;
    roomNameInput.value = null;
    modalForm.reset();
}

modalForm.addEventListener("submit", makeRoomSubmit);


//----------------------------------------------------------------------------------------------------------------
socket.on("make_room_client", async (room_name, room_nick) => {

    // 카메라, 마이크 장치 연결 설정
    //peerconnections 만드는 메소드
    if (room_name) {
        alert('이미 존재하는 방 입니다');
    } else if (room_nick) {
        alert('이미 존재하는 닉네임 입니다');
    } else {
        await getMedia();
        showRoom();
    }
});

socket.on("room_confirm", async (room_name, room_nick) => {
    if (room_name) {
        alert('존재하지 않는 방입니다');
    } else if (room_nick) {
        alert('이미 존재하는 닉네임 입니다');
    } else {
        await getMedia();
        showRoom();
        socket.emit("enter_room", "방입장", roomName, nickname);
    }


});


//a가 create offer를 만든다
socket.on("welcome", async (userId, user_nick) => {
    peer_nick_array.push(user_nick)
    myPeerConnection_list[userId] = makeConnection(userId, user_nick);


    //들어옴 안들어옴 확인 코드
    if (user_nick !== null) {
        const span = document.createElement('span');
        const dom = `
  <span class="in_out_sapn">${user_nick + "님이 들어왔습니다"}</span>`;
        span.innerHTML = dom;
        chatting_list.appendChild(span);
        display_container.scrollTo(0, display_container.scrollHeight);
    }


    //b와 연결할 코드
    myDataChannel[user_nick] = myPeerConnection_list[userId].createDataChannel("chat");//채널 만듬
    myDataChannel[user_nick].addEventListener("message", addMessage); //나의 메세지


    const offer = await myPeerConnection_list[userId].createOffer(); //2번.create 로컬 offer 생성

    await myPeerConnection_list[userId].setLocalDescription(offer);//3번.로컬 sdp 설정
    socket.emit("send_offer", offer, userId);//4번.상대방에게 sdp 전송
});

//b가 받는다
socket.on("receive_offer", async (offer, userId_other, user_nick) => {
    peer_nick_array.push(user_nick)


    //피어커넥션 생성
    myPeerConnection_list[userId_other] = makeConnection(userId_other, user_nick);

    //a와 채팅 연결할 코드
    myPeerConnection_list[userId_other].addEventListener("datachannel", (e) => {
        myDataChannel[user_nick] = e.channel;
        myDataChannel[user_nick].addEventListener("message", addMessage);//상대방 메세지
    });


    await myPeerConnection_list[userId_other].setRemoteDescription(offer); //수신자 2번 수신 받은 sdp 설정
    const answer = await myPeerConnection_list[userId_other].createAnswer(); //수신자 3번 호출하여 sdp 앤서를 만든다
    await myPeerConnection_list[userId_other].setLocalDescription(answer);
    socket.emit("send_answer", answer, userId_other);//수신자 4번 상대방에게 보내주기
});


//a가 받는다
socket.on("receive_answer", (answer, userId) => {
    myPeerConnection_list[userId].setRemoteDescription(answer);//7.신호 받은 sdp를 사용해준다
});
//----------------------------------------------------------------------------------------------------------------


//상대 피어를 수신하는 코드
socket.on("receive_ice", (ice, userId) => {
    myPeerConnection_list[userId].addIceCandidate(ice);//8. 원격 ice 후보를 대기하고 사용 //수신자 7번 ice 후보 대기 하여 사용
});

socket.on("leave", async (userId_other, user_nick) => {

//초기 설정을 네임값으로 설정해서 네임값으로 삭제 조건문 만들기
    if (user_nick !== null) {
        const span = document.createElement('span');
        const dom = `
  <span class="in_out_sapn">${user_nick + "님이 나갔습니다"}</span>`;
        span.innerHTML = dom;
        chatting_list.appendChild(span);
        display_container.scrollTo(0, display_container.scrollHeight);
    }

    const video_remove = document.getElementById('video' + user_nick).value;
    console.log("video_remove")
    console.log(video_remove)

    if (video_remove === null){
        const video_make = document.getElementById('video_maker');
        video_make.remove();
        myPeerConnection_list[userId_other].close();//유저를 종료 시킨다
        hTagCount === 0;
    }else {
        const video_make = document.getElementById('video'+user_nick);
        video_make.remove();
        myPeerConnection_list[userId_other].close();//유저를 종료 시킨다
        hTagCount === 0;
    }




});


// --------- RTC Code ---------


//peerconnections 만드는 메소드
function makeConnection(userId, user_nick) {


    let myPeerConnection = new RTCPeerConnection(); //1번 인스턴스 생성 //수신자 1번 인스턴스 생성
    myPeerConnection.addEventListener("icecandidate", function (data) {
        socket.emit("send_ice", data.candidate, userId);//내가 다른 유저에게 나의 아이스 정보를 보내기 위해서
    });


    myPeerConnection.addEventListener("addstream", function handleAddStream(data) {
        let new_peerVideo = document.createElement('video');
        new_peerVideo.setAttribute('class', 'video');
        if (user_nick == null){
            console.log("닉네임이 존재X")
            new_peerVideo.setAttribute('id', 'video_maker');
        }else{
            console.log("닉네임이 존재ㅇ")
            new_peerVideo.setAttribute('id', 'video' + user_nick);
        }
        new_peerVideo.setAttribute('autoplay', '');
        new_peerVideo.setAttribute('width', "300");
        new_peerVideo.setAttribute('height', "300");
        videoGrid.appendChild(new_peerVideo);

        new_peerVideo.srcObject = data.stream;
        hTagCount++;
    });

    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
    return myPeerConnection
}


function addMessage(nick, msg) {//나의 메세지를 화면에 보이는 코드
    //닉네임과 메세지값 나누기 위해서
    var str = nick.data;
    var words = str.split('𖠌');

    // const file = URL.createObjectURL(img.data);
    let today = new Date();//시간 객체
    if (nick.data === "null") {
        const div = document.createElement('div');
        div.setAttribute('class', 'sender');

        const dom = `
  <span class = "sender_message">${msg.data}</span>
  <p class = "time">${today.toLocaleTimeString()}</p>
`;
        div.innerHTML = dom;
        chatting_list.appendChild(div);
        display_container.scrollTo(0, display_container.scrollHeight);
    } else if (words[1] !== "없음") {
        let today = new Date();//시간 객체
        const div = document.createElement('div');
        div.setAttribute('class', 'user');
        const dom = `
  <p class="user_nick">${words[0]}</p>
  <span class="user_message">${words[1]}</span>
  <p class = "user_time">${today.toLocaleTimeString()}</p>
`;
        div.innerHTML = dom;
        chatting_list.appendChild(div);
        display_container.scrollTo(0, display_container.scrollHeight);
    } else if (words[2] !== "null" && words[1] === "없음") {//이미지 처리
        let today = new Date();//시간 객체
        const div = document.createElement('div');
        div.setAttribute('class', 'user');


        const dom = `
  <p class="user_nick">${words[0]}</p>
  <img class="your_send_image" src= ${words[2]}>
   <p class = "user_time">${today.toLocaleTimeString()}</p>
`;
        div.innerHTML = dom;
        chatting_list.appendChild(div);
        display_container.scrollTo(0, display_container.scrollHeight);
    }
}


function handleChatSubmit(e) {
    e.preventDefault();
    const input = chatForm.querySelector("textarea"); //버튼을 누르게 되면
    var values = Object.values(myDataChannel);

    for (let i = 0; i < values.length; i++) { // 배열 arr의 모든 요소의 인덱스(index)를 출력함.
        if (input.value !== "") {

            values[i].send(`${nickname}𖠌 ${input.value}`);//반복문으로 닉네임값과 메세지값을 데이터채널 데이터에 보낸다
        }
    }

    if (input.value !== "") {
        //채팅값 최하단으로 내리기
        display_container.scrollTo(0, display_container.scrollHeight);
        addMessage({data: `null`}, {data: `${input.value}`}, {data: result});//나의 메세지
        input.value = "";
    } else if (input.value === null) {
        if (result !== null) {
            display_container.scrollTo(0, display_container.scrollHeight);
            addMessage({data: `null`}, {data: `null`});//나의 메세지
        } else {
            window.alert("메세지를 입력해주세요!!!"); //window.alert는 간단한 다이얼로그 메세지를 보여줄수있는 메소드
        }
    } else {
        if (result !== null) {
            display_container.scrollTo(0, display_container.scrollHeight);
            addMessage({data: `null`}, {data: `null`});//나의 메세지
        } else {
            window.alert("메세지를 입력해주세요!!!"); //window.alert는 간단한 다이얼로그 메세지를 보여줄수있는 메소드
        }
    }
}

chatForm.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("send-button").click();
    }
});

chatForm.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
    }
});

chatForm.addEventListener("submit", handleChatSubmit);


//모달창
btnOpenModal.addEventListener("click", () => {
    modal.style.display = "flex";
});


make_cancel.addEventListener("click", e => {
    modal.style.display = "none"
});


//이미지 파일 취소버튼
image_cancel.addEventListener("click", e => {
    e.preventDefault();
    modal_image.style.display = "none"
});


//이미지 파일 열기
event.target.files = undefined;

function openTextFile(e) {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";
    input.id = "uploadInput";

    input.click();

    input.onchange = function (event) {
        const file = event.target.files[0];
        var reader = new FileReader();

        reader.onload = function () {
            modal_image.style.display = "flex";



            image = reader.result;

            document.getElementById('image_name').innerText = file.name;
            document.getElementById('tartgetImg').setAttribute('src', image);
            event.target.value = '';
        };
        reader.readAsDataURL(file);


        send_image.addEventListener("click", e => {
            e.preventDefault();
            modal_image.style.display = "none"

            var values = Object.values(myDataChannel);
            for (let i = 0; i < values.length; i++) {// 배열 arr의 모든 요소의 인덱스(index)를 출력함.
                values[i].send(`${nickname}𖠌${image_null}𖠌${image}`);//반복문으로 닉네임값과 메세지값을 데이터채널 데이터에 보낸다
            }

            display_container.scrollTo(0, display_container.scrollHeight);

            addimage({data: `null`}, {data: image});//나의 메세지
            image = null;
        });
    };
}


function addimage(nick, img) {//나의 메세지를 화면에 보이는 코드
    //닉네임과 메세지값 나누기 위해서
    // const file = URL.createObjectURL(img.data);
    let today = new Date();//시간 객체
    if (nick.data === "null" && img.data !== null) { //나의 채팅방에 보여짐
        const div = document.createElement('div');
        div.setAttribute('class', 'sender');

        const dom = `
     <img class="my_send_image" src=${img.data}>
     <p class = "time">${today.toLocaleTimeString()}</p>
`;
        div.innerHTML = dom;
        chatting_list.appendChild(div);
        display_container.scrollTo(0, display_container.scrollHeight);
    }
}










