"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import ConditionCard from './ConditionCard'
import { useCookies } from '@/hooks/use-cookies';
import CustomerData from '@/types/CustomerData'
import ApiService from '@/services/ApiService'
import CustomerRequest from '@/types/CustomerRequest'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import FileUploadModal from './FileUploadModal'

interface props {
    customerData: CustomerData | null
    updateCustomer: (customerData: CustomerData | null) => void
    setView: (view: string) => void
}

const CustomerInfo: React.FC<props> = ({ customerData, updateCustomer, setView }) => {
    const { getCookie } = useCookies();
    const deleteUser = () => {
        const accessToken = getCookie('accessToken')
        const req: CustomerRequest = {
            method: 'delete',
            id: customerData!.id
        }
        ApiService.customerPOST(accessToken!, req).then(res => {
            updateCustomer(null)
            setView('home')
        }).catch(e => {
            console.error(`Error running delete: ${e}`)
        })
    }
    return (
    <>
        <CardHeader>
            <CardTitle className="flex font-semibold text-lg leading-none sm:text-3xl justify-center">
            <p className="ml-4 mt-4">Customer Info</p>
            <Button variant='ghost' className='p-0 mt-4 mr-4 ml-auto font-seriff hover:bg-inherit' onClick={() => setView('lookup')}>
                <ArrowRight className="h-6 w-6" />
            </Button>
            </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-relative-offset">
            <div className="ml-8 mt-8">
                <h1 className="text-lg">Customer ID: {customerData ? customerData.id : ''}</h1>
                <h1 className="text-lg">Customer name: {customerData ? customerData.first_name + ' ' +  customerData.last_name : ''}</h1>
                <Separator className="my-4" />
                <div className=" w-full grid grid-cols-5 gap-x-4 gap-y-2 overflow-hidden">
                    {customerData && customerData.conditions!.map((condition, index) => (
                        <ConditionCard key={index}
                            conditionIndex={index}
                            conditionStatus={condition}
                        />
                    ))}
                </div>
            </div>
            <div className="mt-auto pt-2 mb-2 mx-8 flex justify-between">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Customer</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you'd like to permanently delete the customer:
                            <br/>
                            <strong>{customerData?.first_name + ' ' + customerData?.last_name}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteUser}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
                <FileUploadModal />
            </div>
        </CardContent>
    </>
    )
}

export default CustomerInfo