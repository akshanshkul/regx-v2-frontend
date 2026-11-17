// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDzv9ZQrfd5zbx6i1bNvdqvImmGsO-_3Wo",
  authDomain: "regx-bcebd.firebaseapp.com",
  projectId: "regx-bcebd",
  storageBucket: "regx-bcebd.firebasestorage.app",
  messagingSenderId: "948274623900",
  appId: "1:948274623900:web:1245ea9f8a918e075e8459",
  measurementId: "G-993FJZZRGJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);