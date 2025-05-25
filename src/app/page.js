"use client";
import Image from "next/image";
import {useEffect} from "react";
import { SignedOut, SignInButton, SignUpButton, ClerkProvider, SignedIn } from '@clerk/nextjs';
export default function Home() {

    // const  signInWithMicrosoft = () => {
    //     const client = new Client();
    //     client
    //         .setEndpoint('https://fra.cloud.appwrite.io/v1')
    //         .setProject('683162b7002d988e3757');
    //
    //     const account = new Account(client);
    //     account.createOAuth2Session(
    //         'microsoft',
    //         'http://localhost:3000/dashboard',
    //         'http://localhost:3000/'
    //     ).then((response) => {
    //         console.log(response);
    //     }).catch((error) => {
    //         console.error(error);
    //     });
    // }

  return (
    // <ClerkProvider>
     
    // </ClerkProvider>
     <div className={"flex flex-col items-center justify-center min-h-screen py-2 "}>
           <img className={"w-[300px]"} src={"/klc.png"}/>
              <p className={"text-2xl py-4"}>Welcome to the KLC Employee Portal</p>
          <SignedOut>
              <div className={"flex flex-row items-center justify-center gap-4"}>
                  <SignInButton mode={"modal"} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold" />
              <SignUpButton mode={"modal"} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold" />
              </div>
            </SignedOut>
          <SignedIn>

              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold" onClick={() => window.location.href = "/dashboard"}>
  Go To Dashboard
</button>
          </SignedIn>


      </div>

  );
}
