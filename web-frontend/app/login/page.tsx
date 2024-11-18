"use client"

import Login from '@/components/Login'
import LoginService from '@/services/LoginService'
import { useCookies } from '@/hooks/use-cookies'
import React, { useEffect, useState } from 'react'
import ResponseType from '@/types/LoginResponseType'

const service = new LoginService()

const LoginPage = () => {
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

    if (isLoggedIn) {
        window.location.href = '/'
    }
    return <Login service={service} />
}

export default LoginPage