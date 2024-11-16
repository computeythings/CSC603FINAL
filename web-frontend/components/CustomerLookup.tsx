"use client"

import React, { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowLeft, Plus } from 'lucide-react'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,    
} from "@/components/ui/tabs"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCookies } from '@/hooks/use-cookies';
import CustomerData from '@/types/CustomerData'
import ApiService from '@/services/ApiService'

interface props {
    setView: (view: string) => void
    updateCustomer: (found: CustomerData | null) => void
    currentCustomer: CustomerData | null
}

const CustomerLookup: React.FC<props> = ({ currentCustomer, updateCustomer, setView }) => {
    const { getCookie } = useCookies();
    const [lookupFail, setLookupFail] = useState(false);

    const getCustomerByID = (id: string): Promise<CustomerData| null> => {
        return ApiService.getCustomerByID(getCookie('accessToken')!, id)
    }
    const getCustomerBySSN = (ssn: string, firstName: string, lastName: string): Promise<CustomerData | null> => {
        return ApiService.getCustomerBySSN(getCookie('accessToken')!, ssn, firstName, lastName)
    }

    // Allow only numeric input and limit the length to 12 digits
    const isNumeric = (str: string): boolean => {
        return /^\d+$/.test(str);
    }

    const idFormSchema = z.object({
        id: z.string().min(12).max(12)
    }).refine((data) => {
        return isNumeric(data.id)
    }, {
        message: "Invalid Customer ID",
        path: ["id"]
    })
    const idForm = useForm<z.infer<typeof idFormSchema>>({
        resolver: zodResolver(idFormSchema),
        defaultValues: {
            id: "",
        },
    })
    function onIDSubmit(values: z.infer<typeof idFormSchema>) {
        getCustomerByID(values.id).then(customerData => {
            updateCustomer(customerData)
            if (customerData) {
                idForm.clearErrors()
                setView('info')
            } else {
                setLookupFail(true)
            }
        }).catch(e => {
            e.printStackTrace()
        })
    }

    // Allow only numeric input and limit the length to 9 digits
    const ssnFormSchema = z.object({
        ssn: z.string().min(9).max(9),
        first_name: z.string().min(2).max(50),
        last_name: z.string().min(2).max(50),
    }).refine((data) => {
        return isNumeric(data.ssn)
    }, {
        message: "Invalid Customer ID",
        path: ["ssn"]
    })
    const ssnForm = useForm<z.infer<typeof ssnFormSchema>>({
      resolver: zodResolver(ssnFormSchema),
      defaultValues: {
        ssn: "",
        first_name: "",
        last_name: "" 
      },
    })
    function onSSNSubmit(values: z.infer<typeof ssnFormSchema>) {
        getCustomerBySSN(values.ssn, values.first_name, values.last_name).then(customerData => {
            updateCustomer(customerData)
            if (customerData) {
                ssnForm.clearErrors()
                setView('info')
            } else {
                setLookupFail(true)
            }
        }).catch(e => {
            e.printStackTrace()
        })
    }
  return (
    <>
    <CardHeader className='mb-8'>
        <CardTitle>
            <div className="flex justify-center align-items-center font-semibold text-lg sm:text-3xl">
                <Button variant='ghost' className={`p-0 mr-4 font-seriff hover:bg-inherit visibility: ${currentCustomer == null ? 'hidden' : 'visible'}`} onClick={() => setView('info')}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <p className="mx-auto text-center pl-[7vw]">Customer Lookup</p>
                <Button variant='outline' className='font-seriff' onClick={() => setView('add')}>
                    <Plus className="mr-2 h-4 w-4" /> New Customer
                </Button>
            </div>
        </CardTitle>
    </CardHeader>
    <CardContent>
        <Tabs defaultValue='id'>
            <TabsList className="grid w-[40%] grid-cols-2 m-auto">
                <TabsTrigger value="id">Customer ID</TabsTrigger>
                <TabsTrigger value="ssn">SSN</TabsTrigger>
            </TabsList>
            <TabsContent value='id'>
                <Form {...idForm}> 
                    <div className='flex flex-col w-[40%] m-auto'>
                        <form onSubmit={idForm.handleSubmit(onIDSubmit)} className="space-y-8 flex flex-col w-full">
                            <FormField
                                control={idForm.control}
                                name="id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer ID:</FormLabel>
                                        <FormControl>
                                            <Input className='bg-white' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button variant='outline' type="submit" className="m-auto">Search</Button>
                        </form>
                    </div>
                </Form>
            </TabsContent>
            <TabsContent value='ssn'>
                <Form {...ssnForm}> 
                    <div className='flex flex-col w-[40%] m-auto'>
                        <form onSubmit={ssnForm.handleSubmit(onSSNSubmit)} className="space-y-8 flex flex-col">
                        <FormField
                                control={ssnForm.control}
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
                            <div className="flex">
                                <FormField
                                    control={ssnForm.control}
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
                                    control={ssnForm.control}
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
                            <Button variant='outline' type="submit" className="m-auto">Search</Button>
                        </form>
                    </div>
                </Form>
            </TabsContent>
        </Tabs>
    </CardContent>
    <AlertDialog open={lookupFail} onOpenChange={setLookupFail}>
        <AlertDialogContent className="w-fit">
            <AlertDialogHeader>
                <AlertDialogTitle>No customer found</AlertDialogTitle>
                <AlertDialogDescription className="m-auto">
                    No customer currently exists with this information.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction className="m-auto">Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

export default CustomerLookup