"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import MFAForm from './MFAForm'
import ResponseType from '@/types/LoginResponseType'

interface props {
    user: string
    mfaSecret: string
    submit: (mfaCode: string) => Promise<ResponseType>
}

const ISSUER = 'DocuMedIQ'

const MFASetupForm: React.FC<props> = ({ user, mfaSecret, submit }) => {
    const [qr, setQR] = useState<string>('')
    const otpAuthUrl = `otpauth://totp/${ISSUER}:${user}?secret=${mfaSecret}&issuer=${ISSUER}`;
    QRCode.toDataURL(otpAuthUrl).then(setQR)
    return (
        <>
            <Image 
                src={qr}
                alt={mfaSecret}
                className='mx-auto'
            />
            <MFAForm submit={submit}/>
        </>
    )
}

export default MFASetupForm