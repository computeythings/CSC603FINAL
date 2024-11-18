"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Dropzone, {useDropzone} from 'react-dropzone';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const FileUploadModal: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const {getRootProps, getInputProps, open, acceptedFiles} = useDropzone({
      // Disable click and keydown behavior
      noClick: false,
      noKeyboard: false,
      onDrop: (acceptedFiles) => {
        // Add the new files to the existing files array
        setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
      }
    });
  
    const fileList = files.map(file => (
        <li key={file.name}> {/* Use file.name instead of file.path */}
            {file.name} - {file.size} bytes
        </li>
    ));
    return (
        <Dialog>
        <DialogTitle></DialogTitle>
        <DialogTrigger asChild>
            <Button variant="outline">Upload Document</Button>
        </DialogTrigger>
        <DialogContent className="max-w-[70vw] min-h-[50vh]">
            <div className="container flex flex-col">
                <div {...getRootProps({className:'h-[35vh] flex flex-col flex-grow m-10 mb-2 text-center justify-between items-center border-2 border-dashed border-gray-500 bg-gray-200 rounded-md'})}>
                <input {...getInputProps()} />
                <p className='my-auto'>Drag 'n' drop some files here</p>
                </div>
                <div className="mx-16 flex">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Files:</h2>
                        <ul className="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">{fileList}</ul>
                    </div>
                    <div className="ml-auto mt-auto">
                        <Button variant="outline" onClick={open} className='mt-auto mb-2 shadow-md'>Submit</Button>
                    </div>
                </div>
            </div>
        </DialogContent>
        </Dialog>
    )
}

export default FileUploadModal