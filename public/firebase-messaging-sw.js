importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDvmvqC2ENI3Twx5JzVXS3VsiOAOthmIMI",
  projectId: "tnj-infra-app",
  messagingSenderId: "294302478190",
  appId: "1:294302478190:web:10c73c2cbd4b2d66d0db7f"
});

const messaging = firebase.messaging();