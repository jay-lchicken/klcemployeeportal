"use client";
import {SignedIn, SignedOut, SignInButton, SignUpButton, useUser} from "@clerk/nextjs";
import {use, useEffect, useState} from "react";
import {Logs, TrendingUp, TrendingDown, Calendar, Filter} from 'lucide-react';

export default function Home() {
    const {user, isLoaded} = useUser();
    const [departments, setDepartments] = useState(null)
    const [is404, setIs404] = useState(false);
    const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
    const [points, setPoints] = useState(null);
    const [logs, setLogs] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState('all'); // 'all', 'positive', 'negative'

    useEffect(() => {

        if (isLoaded && user) {
            fetch('/api/getPoints', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({userId: user.id})
            })
                .then(res => res.json())
                .then(data => {
                    setPoints(data.res[0]?.points || 0);

                });
            fetch('/api/now', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: user.id,
                    email: user.emailAddresses[0]?.emailAddress,
                    name: user.firstName
                }),
            })
                .then(res => res.json())
                .then(data => {
                    console.log(data.res);
                    setDepartments(data.res)
                    if (data.error) {
                        setIs404(true);
                    }
                    setIsLoadingDepartments(false);
                });
            fetch('/api/fetchLogs', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({userId: user.id})
            })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        console.error("Error fetching logs:", data.error);
                    } else {
                        setLogs(data.res);
                        setIsLoading(false);
                    }

                });
        }

    }, [isLoaded, user]);

    // Filter logs based on selected filter
    const filteredLogs = logs ? logs.filter(log => {
        if (filterType === 'positive') return log.change > 0;
        if (filterType === 'negative') return log.change < 0;
        return true;
    }) : [];

    // Calculate stats
    const totalChanges = logs ? logs.reduce((sum, log) => sum + log.change, 0) : 0;
    const positiveChanges = logs ? logs.filter(log => log.change > 0).length : 0;
    const negativeChanges = logs ? logs.filter(log => log.change < 0).length : 0;

    if (!isLoaded) return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-slate-600 font-medium">Loading...</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br ">
            <SignedIn>
                <div className={"flex min-h-screen py-2"}>
                    <div
                        className="rounded-3xl flex flex-col items-start justify-start bg-white/80 backdrop-blur-sm shadow-xl border border-white/20 m-3 h-[95vh] p-8  min-w-[500px] hover:shadow-2xl transition-shadow duration-300">
                        <div className="flex items-center space-x-3 mb-6">
                            <div
                                className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {user?.firstName?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                    Welcome, {user?.firstName}!
                                </h2>
                            </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-2xl p-4 mb-6 w-full border border-slate-200/50">
                            <p className="text-slate-600 font-medium mb-1">Email Address</p>
                            <p className="text-slate-800 font-mono text-sm bg-white px-3 py-2 rounded-lg border">
                                {user?.emailAddresses[0]?.emailAddress}
                            </p>
                            <p className="text-slate-600 font-medium mb-1">Points</p>
                            {points !== null ? (
                                <p className="text-slate-800 font-mono text-sm bg-white px-3 py-2 rounded-lg border">
                                    {points}
                                </p>
                            ) : (
                                <p className="text-slate-800 font-mono text-sm bg-white px-3 py-2 rounded-lg border">
                                    Loading points...
                                </p>
                            )}


                        </div>

                        <div className="w-full">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <p className="text-slate-700 font-semibold text-lg">Departments</p>
                            </div>

                            <div className={"w-full flex flex-wrap max-w-[350px] gap-2"}>
                                {isLoadingDepartments ? (
                                    <div className="flex items-center space-x-2 text-slate-500">
                                        <div className="animate-pulse w-4 h-4 bg-slate-300 rounded-full"></div>
                                        <span>Loading departments...</span>
                                    </div>
                                ) : is404 ? (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">!</span>
                                            </div>
                                            <p className="text-red-700 font-medium">No departments found</p>
                                        </div>
                                        <p className="text-red-600 text-sm mt-1 ml-7">You are not registered in any
                                            department.</p>
                                    </div>
                                ) : (
                                    departments && departments.map((dept, index) => (
                                        <span
                                            className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium text-sm shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
                                            key={index}
                                        >
              {dept.name}
            </span>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Logs Section */}
                    <div
                        className="rounded-3xl flex flex-col bg-white/80 backdrop-blur-sm shadow-xl border border-white/20 m-3 h-[95vh] w-full hover:shadow-2xl transition-shadow duration-300 overflow-hidden">
                        {/* Header */}
                        <div className="p-8 pb-4 border-b border-slate-200/50">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <Logs size={24} className="text-white"/>
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                            Activity Logs
                                        </h2>
                                        <p className="text-slate-500 text-sm mt-1">Track your point changes and
                                            activities</p>
                                    </div>
                                </div>

                                {/* Filter Buttons */}
                                <div className="flex items-center space-x-2">
                                    <Filter size={16} className="text-slate-400"/>
                                    <div className="flex bg-slate-100 rounded-xl p-1">
                                        <button
                                            onClick={() => setFilterType('all')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                filterType === 'all'
                                                    ? 'bg-white shadow-sm text-slate-800'
                                                    : 'text-slate-600 hover:text-slate-800'
                                            }`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setFilterType('positive')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                filterType === 'positive'
                                                    ? 'bg-white shadow-sm text-green-700'
                                                    : 'text-slate-600 hover:text-green-600'
                                            }`}
                                        >
                                            Gains
                                        </button>
                                        <button
                                            onClick={() => setFilterType('negative')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                filterType === 'negative'
                                                    ? 'bg-white shadow-sm text-red-700'
                                                    : 'text-slate-600 hover:text-red-600'
                                            }`}
                                        >
                                            Losses
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            {logs && logs.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div
                                        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-blue-600 text-sm font-medium">Total Changes</p>
                                                <p className={`text-2xl font-bold ${totalChanges >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {totalChanges >= 0 ? `+${totalChanges}` : totalChanges}
                                                </p>
                                            </div>
                                            <div
                                                className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                                                <Calendar size={20} className="text-white"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-green-600 text-sm font-medium">Positive</p>
                                                <p className="text-2xl font-bold text-green-600">{positiveChanges}</p>
                                            </div>
                                            <div
                                                className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                                <TrendingUp size={20} className="text-white"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-red-600 text-sm font-medium">Negative</p>
                                                <p className="text-2xl font-bold text-red-600">{negativeChanges}</p>
                                            </div>
                                            <div
                                                className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                                                <TrendingDown size={20} className="text-white"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Logs Content */}
                        <div className="flex-1 overflow-hidden">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div
                                            className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                                        <p className="text-slate-500 font-medium">Loading activity logs...</p>
                                    </div>
                                </div>
                            ) : filteredLogs.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div
                                            className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Logs size={32} className="text-slate-400"/>
                                        </div>
                                        <p className="text-slate-500 font-medium text-lg mb-2">No logs found</p>
                                        <p className="text-slate-400 text-sm">
                                            {filterType === 'all'
                                                ? 'No activity logs available yet.'
                                                : `No ${filterType} changes found.`
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full overflow-y-auto px-8 pb-8">
                                    <div className="space-y-3">
                                        {filteredLogs.map((log, index) => (
                                            <div
                                                key={index}
                                                className="group bg-white rounded-xl border border-slate-200/50 p-4 hover:shadow-md hover:border-slate-300/50 transition-all duration-200"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4 flex-1">
                                                        <div
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                                log.change > 0
                                                                    ? 'bg-green-100 text-green-600'
                                                                    : 'bg-red-100 text-red-600'
                                                            }`}>
                                                            {log.change > 0 ? (
                                                                <TrendingUp size={20}/>
                                                            ) : (
                                                                <TrendingDown size={20}/>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-slate-800 font-semibold text-base mb-1 group-hover:text-slate-900 transition-colors">
                                                                {log.reason}
                                                            </p>
                                                            <div
                                                                className="flex items-center space-x-4 text-sm text-slate-500">
                                                                <div className="flex items-center space-x-1">
                                                                    <Calendar size={14}/>
                                                                    <span>
      {new Intl.DateTimeFormat('en-SG', {
          timeZone: 'Asia/Singapore',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
      }).format(new Date(log.date_added))}
    </span>
                                                                </div>
                                                                <span className="text-slate-300">•</span>
                                                                <span>
    {new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // optional: set to true for AM/PM format
    }).format(new Date(log.date_added))}
  </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                                                        log.change > 0
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {log.change > 0 ? `+${log.change}` : log.change}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </SignedIn>
            <SignedOut>
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                    <div
                        className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-red-200/50 text-center max-w-md">
                        <div
                            className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-white text-2xl font-bold">!</span>
                        </div>
                        <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
                        <p className="text-red-600 mb-6">You need to sign in to access this application.</p>
                        <div className="space-y-3">
                            <SignInButton mode="modal">
                                <button
                                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button
                                    className="w-full bg-white text-slate-700 font-semibold py-3 px-6 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200">
                                    Sign Up
                                </button>
                            </SignUpButton>
                        </div>
                    </div>
                </div>
            </SignedOut>
        </div>
    );
}