"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface props {
    conditionIndex: number
    conditionStatus: boolean
}
const products = [
    "CPAP machines",
    "Insulin pumps",
    "Nebulizers",
    "Glucose monitors",
    "TENS units",
    "Oxygen concentrators",
    "BiPAP machines",
    "Hearing aids",
    "Home dialysis machines",
    "Implantable cardiac monitors",
    "Infusion pumps",
    "Blood pressure monitors",
    "Prosthetic devices (custom-fitted)",
    "Automatic external defibrillators (AEDs)"
]

const CustomerInfo: React.FC<props> = ({ conditionIndex, conditionStatus }) => {
    return (
    <Card className="p-2">
        <CardContent className="p-0 flex flex-col">
            <p className="text-center font-semibold mx-4">{products[conditionIndex]}</p>
            <p className="text-center">{conditionStatus ? 'Yes' : 'No'}</p>
        </CardContent>
    </Card>
    )
}

export default CustomerInfo