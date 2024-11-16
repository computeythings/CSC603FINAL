"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import CustomerLookup from './CustomerLookup'
import CustomerInfo from './CustomerInfo'
import CustomerAdd from './CustomerAdd'
import CustomerData from '@/types/CustomerData'

interface PageState {
    add: string
    lookup: string
    info: string
}

const Customers: React.FC = () => {
    const [currentCustomer, setCustomer] = useState<CustomerData | null>(null)
    const [view, setView] = useState("lookup")


    const updateCustomer = (customer: CustomerData | null) => {
        setCustomer(customer)
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
        <div className="w-full h-full flex justify-center">
            <Card className="m-12 p-4 w-[90%] relative overflow-hidden min-h-[35em]">
                <div
                    className={`absolute top-0 left-0 w-full h-full transition-transform duration-500 ease-in-out ${pageState().add}`}
                >
                    <CustomerAdd updateCustomer={updateCustomer} setView={setView} />
                </div>
                <div
                    className={`top-0 left-0 w-full h-full transition-transform duration-500 ease-in-out ${pageState().lookup}`}
                >
                    <CustomerLookup updateCustomer={updateCustomer} currentCustomer={currentCustomer} setView={setView} />
                </div>
                <div
                    className={`absolute top-0 left-0 w-full h-full transition-transform duration-500 ease-in-out ${pageState().info}`}
                >
                    <CustomerInfo customerData={currentCustomer} updateCustomer={updateCustomer} setView={setView} />
                </div>
            </Card>
        </div>
    );
}

export default Customers;