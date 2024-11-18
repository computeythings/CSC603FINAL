"use client"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import React, { useEffect, useState, ReactNode } from 'react'
import { useCookies } from '@/hooks/use-cookies'
import LoginService from '@/services/LoginService'
import ResponseType from '@/types/LoginResponseType'
import { Toaster } from "@/components/ui/toaster";

const service = new LoginService()

interface props {
	children: ReactNode
}

const MainLayout = ({ children }: props) => {
	const { getCookie } = useCookies()
	const [isClient, setIsClient] = useState(false)
	const [isLoggedIn, setIsLoggedIn] = useState(false)

	useEffect(() => {
		setIsClient(true); // Indicates the component has mounted
		setIsLoggedIn(!!getCookie('accessToken')); // Check login state
		if (!isLoggedIn) {
			let refreshToken = getCookie('refreshToken')
			let idToken = getCookie('idToken')
			if (refreshToken && idToken) {
					service.refresh(idToken, refreshToken).then(res => {
						setIsLoggedIn(res == ResponseType.SUCCESS)
					}).catch(err => {
							console.error(err)
					})
			}
		}
	}, [getCookie])

	useEffect(() => {
		}, [getCookie])

	// If we're not on the client yet, we return null to avoid hydration issues
	if (!isClient) {
		return null
	}

	if (!isLoggedIn) {
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
		window.location.href = '/login'
	}

	return (
		<div className="flex flex-col h-screen">
			<Toaster />
			<Navbar />
			<main className="flex-grow">{children}</main>
			<Footer />
		</div>
	)
}

export default MainLayout