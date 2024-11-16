import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { z } from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import ResponseType from '@/types/ResponseType';

interface props {
    submit: (username: string, password: string) => Promise<ResponseType>
}

const LoginCard: React.FC<props> = ({ submit }) => {
    const [loading, setLoading] = useState(false)

    const loginFormSchema = z.object({
        email: z.string().min(1).email("Invalid email"),
        password: z.string().min(7).max(50),
    })
    const loginForm = useForm<z.infer<typeof loginFormSchema>>({
      resolver: zodResolver(loginFormSchema),
      defaultValues: {
        email: "",
        password: ""
      },
    })
    // Define the handleLogin function
    const handleLogin = (values: z.infer<typeof loginFormSchema>) => {
        // Handle login logic here
        setLoading(true)
        submit(values.email, values.password).then(res => {
            if (res == ResponseType.ERROR) {
                loginForm.setError('email', {type: 'manual', message: ''})
                loginForm.setError('password', {type: 'manual', message: ''})
            }
        }).finally(() => {
            setLoading(false)
        })
    };
  return (
    <Form {...loginForm}>
        <form
            onSubmit={loginForm.handleSubmit(handleLogin)}
        >
            <h2 className="text-xl font-bold mb-4 text-center">Login</h2>
            <div className="mb-4">
                <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email:</FormLabel>
                            <FormControl>
                                <Input className="bg-white" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="mb-6">
                <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password:</FormLabel>
                            <FormControl>
                                <Input className="bg-white" type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <Button type="submit" className={`w-full mb-4 ${loading ? 'disabled' : ''}`}>
                <Loader2 className={`mr-2 h-4 w-4 animate-spin ${!loading ? 'hidden' : ''}`} />
                Login
            </Button>
        </form>
    </Form>
  )
}

export default LoginCard