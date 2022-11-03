// let localConnection;
// let remoteConnection;
// let sendChannel;
// let receiveChannel;
// let fileReader;

// function createConnection(){
//     const local = new RTCPeerConnection({
//         iceServers: [
//           {
//             urls: [
//               "stun:stun.stunprotocol.org",
//               "stun:stun.l.google.com:19302",
//               "stun:stun1.l.google.com:19302",
//             ],
//           },
//         ],
//       })
//     //   const local = new RTCPeerConnection()
//       local.onicecandidate = e => {
//         let offer = JSON.stringify(local.localDescription)
//         window.localStorage.setItem("offer", offer)
//       }
      
//       const lchannel = local.createDataChannel("channel")
//       lchannel.onopen = ()=> console.log("opened")
//       lchannel.onclose = ()=> console.log("closed")
//       lchannel.onmessage = ({data})=> console.log(data)
//       local.createOffer().then(o=> local.setLocalDescription(o))
// }

// function connectToConnection(offer){
//   const remote = new RTCPeerConnection({
//     iceServers: [
//       {
//         urls: [
//           "stun:stun.stunprotocol.org",
//           "stun:stun.l.google.com:19302",
//           "stun:stun1.l.google.com:19302",
//         ],
//       },
//     ],
//   })
//   remote.onicecandidate = e => {
//     let answer = JSON.stringify(remote.localDescription)
//     window.localStorage.setItem("answer", answer)
//   }
//   remote.ondatachannel = ({channel}) => {
//   const receive = channel
//   receive.onopen = ()=> console.log("opened")
//   receive.onclose = ()=> console.log("closed")
//   receive.onmessage = ({data})=> console.log(data)
//   remote.channel = receive 
//   remote.setRemoteDescription(offer)
//   remote.createAnswer().then(a=> console.log(remote.setLocalDescription(a)))
  
// }
// }

// export {
//     createConnection,
//     connectToConnection
// }