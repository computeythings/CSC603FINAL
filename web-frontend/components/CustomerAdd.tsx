"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { useCookies } from '@/hooks/use-cookies';
import CustomerData from '@/types/CustomerData'
import ApiService from '@/services/ApiService'
import CustomerRequest from '@/types/CustomerRequest'

interface props {
    updateCustomer: (customerData: CustomerData | null) => void
    setView: (view: string) => void
}

const CustomerAdd: React.FC<props> = ({ updateCustomer, setView }) => {
    const { getCookie } = useCookies();
    const [loading, setLoading] = useState(false)  
    const customerAddSchema = z.object({
        ssn: z.string().min(9).max(9),
        first_name: z.string().min(2).max(50),
        last_name: z.string().min(2).max(50),
        email: z.string().email(),
    }).refine((data) => {
        return isNumeric(data.ssn)
    }, {
        message: "Invalid Customer ID",
        path: ["ssn"]
    })
    const addForm = useForm<z.infer<typeof customerAddSchema>>({
      resolver: zodResolver(customerAddSchema),
      defaultValues: {
        ssn: "",
        first_name: "",
        last_name: "",
        email: "" 
      },
    })

    function onBackClick() {
        setView('lookup')
        addForm.reset()
    }

    function isNumeric(str: string): boolean {
        return /^\d+$/.test(str);
    }

    function addCustomer(firstName: string, lastName: string, ssn: string, email: string): Promise<CustomerData | null> {
        const accessToken = getCookie('accessToken')
        const req: CustomerRequest = {
            method: 'add',
            first_name: firstName,
            last_name: lastName,
            ssn: ssn,
            email: email
        }
        return ApiService.customerPOST(accessToken!, req)
    }

    function onCustomerAdd(values: z.infer<typeof customerAddSchema>) {
        setLoading(true)
        addCustomer(values.first_name, values.last_name, values.ssn, values.email).then(res => {
            addForm.reset()
            if (res) {
                updateCustomer(res)
                setView('info')
            }
        }).catch(err => {
            alert(err)
        }).finally(() => {
            setLoading(false)
        })
    }
    return (
    <>
        <CardHeader>
            <CardTitle className="flex font-semibold text-lg leading-none sm:text-3xl justify-center">
                <Button variant='ghost' className='p-0 ml-4 mt-4 mr-auto font-seriff hover:bg-inherit' onClick={() => onBackClick()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
            </CardTitle>
        </CardHeader>
        <CardContent>
        <Form {...addForm}> 
                    <div className='flex flex-col w-[40%] m-auto'>
                        <form onSubmit={addForm.handleSubmit(onCustomerAdd)} className="space-y-8 flex flex-col">
                        <FormField
                                control={addForm.control}
                                name="ssn"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer SSN:</FormLabel>
                                        <FormControl>
                                            <Input className='bg-white' {...field}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={addForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer email:</FormLabel>
                                        <FormControl>
                                            <Input className='bg-white' {...field}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex">
                                <FormField
                                    control={addForm.control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormLabel>First Name:</FormLabel>
                                            <FormControl>
                                                <Input className='bg-white' {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addForm.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem className='ml-4 flex-grow'>
                                            <FormLabel>Last Name:</FormLabel>
                                            <FormControl>
                                                <Input className='bg-white' {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button variant='outline' type="submit" className="m-auto">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Add Customer
                            </Button>
                        </form>
                    </div>
                </Form>
        </CardContent>
    </>
    )
}

export default CustomerAdd