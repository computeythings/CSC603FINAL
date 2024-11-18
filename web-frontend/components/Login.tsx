"use client"

import React, { useState } from 'react'
import LoginService from '@/services/LoginService'
import ResponseType from '@/types/LoginResponseType';
import LoginForm from './LoginForm'
import MFAForm from './MFAForm'
import MFASetupForm from './MFASetupForm';
import { useToast } from '@/hooks/use-toast';
import PasswordChangeForm from './PasswordChangeForm';

interface props {
    service: LoginService
}

const LoginPage: React.FC<props> = ({ service }) => {
    const { toast } = useToast()
    const [view, setView] = useState(ResponseType.ERROR)
    const [mfaSecret, setMfaSecret] = useState('')
    const [username, setUsername] = useState('')

    const handlePasswordChange = (newPassword: string) => {
        return service.changePassword(username, newPassword).then(res => {
            if (res == ResponseType.SUCCESS) {
                setView(ResponseType.ERROR) // Send user back to intial login for MFA login
                toast({
                    title: "Success",
                    description: "Password Changed.",
                    // action: <ToastAction altText="Try again">Try again</ToastAction>,
                  })
            } else {
                toast({
                    title: "Error",
                    description: "Unable to change password",
                    //action: <ToastAction altText="Try again">Try again</ToastAction>,
                  })
            }
            return res
        })
    }

    const handleLogin = (username: string, password: string): Promise<ResponseType> => {
        setUsername(username)
        return service.login(username, password).then(res => {
            if (res == ResponseType.SUCCESS) {
                window.location.href = localStorage.getItem('redirectAfterLogin') || '/'
                localStorage.removeItem('redirectAfterLogin')
                return res
            }
            if (res == ResponseType.MFA_SETUP) {
                service.mfaSetupInit().then(r => {
                    setMfaSecret(r)
                })
            }
            // Update view based on response
            setView(res)
            return res
        }).catch(err => {
            console.error(err)
            return err
        })
    }

    const handleMFASetup = (input: string): Promise<ResponseType> => {
        return service.mfaSetupVerify(input).then(res => {
            if (res == ResponseType.SUCCESS) {
                setView(ResponseType.ERROR) // Send user back to intial login for MFA login
                toast({
                    title: "Success",
                    description: "MFA Successfully registered",
                  })
            } else {
                toast({
                    title: "Error",
                    description: "Invalid MFA code",
                  })
            }
            return res
        })
    }

    const handleMFAChallenge = (mfaCode: string): Promise<ResponseType> => {
        return service.mfaChallenge(username, mfaCode).then(res => {
            if (res == ResponseType.SUCCESS) {
                toast({
                    title: "Success",
                    description: "You logged in!",
                })
                window.location.href = localStorage.getItem('redirectAfterLogin') || '/'
                localStorage.removeItem('redirectAfterLogin')
            } else {
                toast({
                    title: "Error",
                    description: "Invalid MFA code",
                  })
            }
            return res
        }) 
    }

    return (
        <div className="flex flex-col bg-primary-foreground h-screen">
            <div className="flex-grow flex flex-col items-center">
                {/* Company Logo */}
                <img 
                    src="/images/banner.png" 
                    alt="Banner" 
                    className="mt-[10%] w-80 mb-4 mix-blend-multiply" 
                    style={{ maxWidth: '100%', height: 'auto' }} // Ensure responsiveness
                />

                {/* Login Form */}
                <div className="bg-white p-8 rounded shadow-md w-96 mb-32">
                    {view == ResponseType.ERROR && <LoginForm submit={handleLogin} />}
                    {view == ResponseType.SOFTWARE_TOKEN_MFA && <MFAForm submit={handleMFAChallenge} />}
                    {view == ResponseType.MFA_SETUP && <MFASetupForm user={username} mfaSecret={mfaSecret} submit={handleMFASetup} />}
                    {view == ResponseType.NEW_PASSWORD_REQUIRED && <PasswordChangeForm submit={handlePasswordChange}/>}
                </div>
            </div>
        </div>
    );
};
  
export default LoginPage;