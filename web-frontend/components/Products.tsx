"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'

interface UserData {
    data: {
        user: {
            id: string
            first_name: string
            last_name: string
            conditions: boolean[]
        }
    }
}

interface PageState {
    add: string
    lookup: string
    info: string
}

const Customers: React.FC = () => {
    const [currentUser, setUser] = useState<UserData | null>(null)
    const [view, setView] = useState("lookup")


    const updateUser = (user: UserData | null) => {
        setUser(user)
    }

    const pageState = (): PageState => {
        switch(view) {
            case 'add':
                return {
                    add: 'translate-x-0',
                    lookup: '-translate-x-full',
                    info: '-translate-x-full'
                }
            case 'info':
                return {
                    add: 'translate-x-full',
                    lookup: 'translate-x-full',
                    info: 'translate-x-0'
                }
            default:
                return {
                    add: 'translate-x-full',
                    lookup: 'translate-x-0',
                    info: '-translate-x-full'
                }
        }
    }
    return (
        <>
        <h1 className='text-4xl font-bold text-center'>Products</h1>
        <div className="h-full grid grid-cols-4 gap-x-8 gap-y-16 m-12 overflow-y: auto max-h-[50%]">
        {[...Array(200)].map((e, i) => <Card key={i} className="h-64">
            </Card>)}
        </div>
        </>
    );
}

export default Customers;