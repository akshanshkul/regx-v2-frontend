import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: 'AIzaSyDzv9ZQrfd5zbx6i1bNvdqvImmGsO-_3Wo',
    authDomain: 'regx-bcebd.firebaseapp.com',
    projectId: 'regx-bcebd',
    storageBucket: 'regx-bcebd.firebasestorage.app',
    messagingSenderId: '948274623900',
    appId: '1:948274623900:web:1245ea9f8a918e075e8459',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
