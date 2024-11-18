"use client"
import React from 'react'
import Link from 'next/link'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCookies } from '@/hooks/use-cookies'

const Navbar: React.FC = () => {
  const { getCookie, setCookie } = useCookies();
  const logout = () => {
    setCookie('accessToken', '')
    setCookie('idToken', '')
    setCookie('refreshToken', '')
    window.location.href = '/'
  } 
  
  return (
      <div className="m-4 flex">
        <NavigationMenu className="flex flex-grow">
            <NavigationMenuList className="flex space-x-4">
              <NavigationMenuItem>
                <div className="flex items-center p-2 font-sans">
                  <img 
                    src="/images/logo.png" 
                    alt="Logo" 
                    className="w-8 mr-2 max-w-full h-auto" 
                  /> DocuMedIQ
                </div>
              </NavigationMenuItem >
              {/* <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Dashboard
                </NavigationMenuLink>
              </Link>
              <Link href="/products" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Products
                </NavigationMenuLink>
              </Link>
              <Link href="/customers" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Customers
                </NavigationMenuLink>
              </Link> */}
            </NavigationMenuList>
            <div className='ml-auto mr-8'>
            <DropdownMenu>
              <DropdownMenuTrigger className='cursor-pointer'>
                <Avatar>
                  <AvatarImage src="https://linguistics.utah.edu/_resources/images/people/grad-students/placeholder.png" alt="Company Name" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='mr-8'>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='cursor-pointer'>Preferences</DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer' onClick={logout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
        </NavigationMenu>
      </div>
  );
};

export default Navbar;