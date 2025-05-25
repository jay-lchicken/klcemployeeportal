"use client";

import {SignedIn, SignedOut, SignInButton, SignUpButton, useUser} from "@clerk/nextjs";
import {useEffect, useState} from "react";

export default function Home() {
    const {user, isLoaded} = useUser();
    const [isLoaded2, setIsLoaded2] = useState(false);
    const [isExco, setIsExco] = useState(false);
    const [members, setMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [departments, setDepartments] = useState([]);
    const [selectedID, setSelectedID] = useState([]);
    const [selectedAction, setSelectedAction] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [selectedDepartmentToRemove, setSelectedDepartmentToRemove] = useState("");
    const [showRemove, setShowRemove] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [showChange, setShowChange] = useState(false);
    const [pointsChange, setPointsChange] = useState(0);
    const [reason, setReason] = useState("");
    const [logs, setLogs] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (isLoaded && user) {
            fetch('/api/checkExco', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({userId: user.id})
            })
                .then(res => res.json())
                .then(data => {
                    if (data.bool) {
                        setIsExco(true);
                        fetch('/api/getMembers', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({userId: user.id})
                        })
                            .then(res => res.json())
                            .then(data => {
                                const mergedMembers = mergeMembersByEmail(data.res.rows || []);
                                setMembers(mergedMembers);
                                setFilteredMembers(mergedMembers);

                                const uniqueDepartments = [...new Set(
                                    data.res.rows.map(member => member.department).filter(Boolean)
                                )].sort();
                                setDepartments(uniqueDepartments);

                                setIsLoaded2(true);
                            });
                    } else {
                        setIsExco(false);
                        setIsLoaded2(true);
                    }
                });
            fetch('/api/getAllPoints', {
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
                        console.log(data.res);
                        setIsLoading(false);
                    }

                });

        }
    }, [isLoaded, user]);
    async function handleChangePoints() {
    setIsProcessing(true);
    try {
        const res = await fetch('/api/changePoints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userIds: selectedID,
                reason: reason,
                change: pointsChange,
                date_added: new Date().toISOString(),
                userId: user.id
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Error applying point changes');

        setMembers(prev =>
            prev.map(member =>
                selectedID.includes(member.user_id)
                    ? { ...member, points: (member.points || 0) + pointsChange }
                    : member
            )
        );

        showNotification(`Changed points for ${selectedID.length} member(s).`, 'success');
    } catch (error) {
        console.error("Error updating points:", error.message);
        showNotification(`Failed to change points: ${error.message}`, 'error');
    } finally {
        setShowChange(false);
        setReason("");
        setPointsChange(0);
        setSelectedID([]);
        setIsProcessing(false);
    }
}
    useEffect(() => {
        if (selectedDepartment === "all") {
            setFilteredMembers(members);
        } else {
            setFilteredMembers(
                members.filter(member =>
                    member.departments.includes(selectedDepartment)
                )
            );
        }
    }, [selectedDepartment, members]);

    // Auto-hide notification after 5 seconds
    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => {
                setNotification({ show: false, message: '', type: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification.show]);

    function showNotification(message, type) {
        setNotification({ show: true, message, type });
    }

    function mergeMembersByEmail(members) {
        const map = new Map();

        members.forEach(member => {
            const existing = map.get(member.email);
            if (existing) {
                if (member.department && !existing.departments.includes(member.department)) {
                    existing.departments.push(member.department);
                }
            } else {
                map.set(member.email, {
                    ...member,
                    departments: member.department ? [member.department] : [],
                });
            }
        });

        return Array.from(map.values()).map(member => ({
            ...member,
            department: member.departments.length > 0 ? member.departments.join(', ') : 'No Department',
        }));
    }

    async function handleApplyAction() {
        if (selectedAction === "add") {
            setShowAdd(true);
        } else if (selectedAction === "remove") {
            setShowRemove(true);
        } else if (selectedAction === "change") {
            setShowChange(true);
        }
    }

    async function addMemberToDepartment(memberIds, department) {
        setIsProcessing(true);
        try {
            const response = await fetch('/api/addDept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userIds: memberIds,
                    departmentName: department,
                    userId: user.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Unknown error');
            }

            console.log('Users successfully added:', data);

            // Update local state
            setMembers(prevMembers =>
                prevMembers.map(member =>
                    memberIds.includes(member.user_id)
                        ? {
                            ...member,
                            departments: [...new Set([...member.departments, department])],
                            department: [...new Set([...member.departments, department])].join(', ')
                        }
                        : member
                )
            );

            // Reset selections
            setSelectedID([]);
            setSelectedDepartmentToRemove("");

            showNotification(`Successfully added ${memberIds.length} member(s) to ${department}`, 'success');
            return { success: true };
        } catch (error) {
            console.error('Failed to add members to department:', error.message);
            showNotification(`Failed to add members: ${error.message}`, 'error');
            return { success: false, error: error.message };
        } finally {
            setIsProcessing(false);
        }
    }

    async function removeMemberFromDepartment(memberIds, department) {
        setIsProcessing(true);
        console.log("Starting removal process.");
        console.log("Member IDs:", memberIds);
        console.log("Department:", department);
        console.log("Logged-in User:", user.id);

        try {
            const response = await fetch('/api/removeDept', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: user.id,
                    userIds: memberIds,
                    departmentName: department,
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log("Removal successful:", data);

                // Update local state
                setMembers(prevMembers =>
                    prevMembers.map(member =>
                        memberIds.includes(member.user_id)
                            ? {
                                ...member,
                                departments: member.departments.filter(dept => dept !== department),
                                department: member.departments.filter(dept => dept !== department).join(', ') || 'No Department'
                            }
                            : member
                    )
                );

                setFilteredMembers(prevFiltered =>
                    prevFiltered.map(member =>
                        memberIds.includes(member.user_id)
                            ? {
                                ...member,
                                departments: member.departments.filter(dept => dept !== department),
                                department: member.departments.filter(dept => dept !== department).join(', ') || 'No Department'
                            }
                            : member
                    )
                );

                // Reset selections
                setSelectedID([]);
                setSelectedDepartmentToRemove("");

                showNotification(`Successfully removed ${memberIds.length} member(s) from ${department}`, 'success');
            } else {
                const errorMessage = data.error || "Failed to remove members.";
                showNotification(`Error: ${errorMessage}`, 'error');
                console.error("Error details:", data);
            }
        } catch (err) {
            console.error("Request failed:", err);
            showNotification("Something went wrong while removing members. Please try again.", 'error');
        } finally {
            setIsProcessing(false);
            console.log("Removal process complete.");
        }
    }
    if (!isLoaded || !isLoaded2) {
        return (
            <div>
                <SignedOut>
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-slate-200/50 text-center max-w-md">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-white text-2xl font-bold">🔐</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome</h2>
                        <p className="text-slate-600 mb-6">Please sign in to access the member management system.</p>
                        <div className="space-y-3">
                            <SignInButton mode="modal">
                                <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="w-full bg-white text-slate-700 font-semibold py-3 px-6 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200">
                                    Sign Up
                                </button>
                            </SignUpButton>
                        </div>
                    </div>
                </div>
            </SignedOut>
                <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-slate-600 font-medium">Loading...</span>
                </div>
            </div>
            </div>

        );
    }



    return (

        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {notification.show && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg border-l-4 ${
                    notification.type === 'success' 
                        ? 'bg-green-50 border-green-400 text-green-800' 
                        : 'bg-red-50 border-red-400 text-red-800'
                } transition-all duration-300 transform ${notification.show ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex items-center">
                        <div className={`flex-shrink-0 w-5 h-5 mr-3 ${
                            notification.type === 'success' ? 'text-green-400' : 'text-red-400'
                        }`}>
                            {notification.type === 'success' ? (
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <p className="font-medium">{notification.message}</p>
                        <button
                            onClick={() => setNotification({ show: false, message: '', type: '' })}
                            className="ml-4 text-gray-400 hover:text-gray-600"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <SignedIn>
                {isExco ? (
                    <div className="p-6">
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold text-slate-800 mb-2">Member Management</h1>
                            <p className="text-slate-600">Manage department assignments and member information</p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <label className="text-sm font-medium text-slate-700">Filter:</label>
                                        <select
                                            value={selectedDepartment}
                                            onChange={(e) => setSelectedDepartment(e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">All Departments</option>
                                            {departments.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <label className="text-sm font-medium text-slate-700">Actions:</label>
                                        <select
                                            value={selectedAction}
                                            onChange={(e) => setSelectedAction(e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Choose Action</option>
                                            <option value="add">Add to Department</option>
                                            <option value="remove">Remove from Department</option>
                                            <option value="change">Change Points</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleApplyAction}
                                    disabled={!selectedAction || selectedID.length === 0}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                                >
                                    Apply Action
                                </button>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                                <div>
                                    Showing {filteredMembers.length} of {members.length} members
                                    {selectedDepartment !== "all" && (
                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                            {selectedDepartment}
                                        </span>
                                    )}
                                </div>
                                {selectedID.length > 0 && (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                        {selectedID.length} selected
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedID.length === filteredMembers.length && filteredMembers.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedID(filteredMembers.map(m => m.user_id));
                                                        } else {
                                                            setSelectedID([]);
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {filteredMembers.map((member, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedID.includes(member.user_id)}
                                                        onChange={(e) => {
                                                            const newList = e.target.checked
                                                                ? [...selectedID, member.user_id]
                                                                : selectedID.filter(id => id !== member.user_id);
                                                            setSelectedID(newList);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{member.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{member.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                                    {member.department === 'No Department' ? (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">No Department</span>
                                                    ) : (
                                                        <span className="text-slate-700">{member.department}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{member.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {filteredMembers.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        <div className="text-4xl mb-4">📋</div>
                                        <h3 className="text-lg font-medium text-slate-900 mb-2">No members found</h3>
                                        <p>No members found for the selected department.</p>
                                    </div>
                                )}
                            </div>

                        </div>
                        {logs && (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-8 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Points Change Logs</h2>
        {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">No logs found.</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Change</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {logs.map((log, idx) => {
                            const member = members.find(m => m.user_id === log.user_id);
                            return (
                                <tr key={idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                        {member ? member.name : log.user_id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{log.reason}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${log.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {log.change > 0 ? `+${log.change}` : log.change}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {new Date(log.date_added).toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
    </div>
)}

                    </div>
                ) : (
                    <div className="min-h-screen flex items-center justify-center p-4">
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-red-200/50 text-center max-w-md">
                            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-white text-2xl font-bold">!</span>
                            </div>
                            <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
                            <p className="text-red-600 mb-6">You need to be authorized to access this page.</p>
                        </div>
                    </div>
                )}

            </SignedIn>

            {showChange && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Change Users' Points</h2>
                <p className="mb-4 text-slate-600">Specify how many points to add or subtract and the reason.</p>

                <input
                    type="number"
                    value={pointsChange}
                    onChange={(e) => setPointsChange(parseInt(e.target.value))}
                    placeholder="e.g. 10 or -5"
                    className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for change..."
                    className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <div className="mt-4 mb-6">
                    <p className="text-sm font-medium text-slate-700 mb-2">
                        Selected members ({selectedID.length}):
                    </p>
                    <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-lg p-3">
                        {members
                            .filter(member => selectedID.includes(member.user_id))
                            .map(member => (
                                <div key={member.user_id} className="text-sm text-slate-700 py-1">
                                    {member.name}
                                </div>
                            ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => setShowChange(false)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleChangePoints}
                        disabled={pointsChange === 0 || reason.trim() === "" || isProcessing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
                    >
                        {isProcessing ? "Processing..." : "Apply"}
                    </button>
                </div>
            </div>
        </div>
    </div>
)}

            {showRemove && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-4 text-slate-900">Remove from Department</h2>
                            <p className="mb-4 text-slate-600">Select the department to remove selected members from:</p>

                            {selectedID.length > 0 && (
                                <select
                                    className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => setSelectedDepartmentToRemove(e.target.value)}
                                    value={selectedDepartmentToRemove}
                                >
                                    <option value="" disabled>Choose department</option>
                                    {members
                                        .filter(member => selectedID.includes(member.user_id))
                                        .map(member => member.departments)
                                        .reduce((acc, depts) => acc === null ? depts : acc.filter(dept => depts.includes(dept)), null)
                                        ?.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))
                                    }
                                </select>
                            )}

                            <div className="mt-4 mb-6">
                                <p className="text-sm font-medium text-slate-700 mb-2">
                                    Selected members ({selectedID.length}):
                                </p>
                                <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-lg p-3">
                                    {members
                                        .filter(member => selectedID.includes(member.user_id))
                                        .map(member => (
                                            <div key={member.user_id} className="text-sm text-slate-700 py-1">
                                                {member.name}
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowRemove(false);
                                        setSelectedDepartmentToRemove('');
                                    }}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRemove(false);
                                        removeMemberFromDepartment(selectedID, selectedDepartmentToRemove);
                                    }}
                                    disabled={!selectedDepartmentToRemove || isProcessing}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Removing...</span>
                                        </>
                                    ) : (
                                        <span>Remove</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAdd && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-4 text-slate-900">Add to Department</h2>
                            <p className="mb-4 text-slate-600">Select the department to add selected members to:</p>

                            {selectedID.length > 0 && (
                                <select
                                    className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => setSelectedDepartmentToRemove(e.target.value)}
                                    value={selectedDepartmentToRemove}
                                >
                                    <option value="" disabled>Choose department</option>
                                    <option value="Development">Development</option>
                                    <option value="Comms">Comms</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Exco">Exco</option>
                                </select>
                            )}

                            <div className="mt-4 mb-6">
                                <p className="text-sm font-medium text-slate-700 mb-2">
                                    Selected members ({selectedID.length}):
                                </p>
                                <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-lg p-3">
                                    {members
                                        .filter(member => selectedID.includes(member.user_id))
                                        .map(member => (
                                            <div key={member.user_id} className="text-sm text-slate-700 py-1">
                                                {member.name}
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowAdd(false);
                                        setSelectedDepartmentToRemove('');
                                    }}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAdd(false);
                                        addMemberToDepartment(selectedID, selectedDepartmentToRemove);
                                    }}
                                    disabled={!selectedDepartmentToRemove || isProcessing}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Adding...</span>
                                        </>
                                    ) : (
                                        <span>Add</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}