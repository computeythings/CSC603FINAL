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
import ApiService from '@/services/ApiService'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCookies } from '@/hooks/use-cookies';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FileUploadModal: React.FC = () => {
    const { getCookie } = useCookies()
    const { toast } = useToast()
    const [openDialog, setOpenDialog] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const {getRootProps, getInputProps, open, acceptedFiles} = useDropzone({
      // Disable click and keydown behavior
      noClick: false,
      noKeyboard: false,
      onDrop: (acceptedFiles) => {
        // Add the new files to the existing files array
        setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
      }
    });

    const removeFile = (fileName: string) => {
        setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
    }

    const upload = () => {
        if (files.length === 0)
            return
        setUploading(true)
        ApiService.uploadFiles(getCookie('accessToken')!, files).then(res => {
            setFiles([])
            setOpenDialog(false)
        }).catch(err => {
            console.error(err)
            toast({
                title: "Error",
                description: err.message,
                duration: 3000
              })
        }).finally(() => {
            setUploading(false)
        })
    }
  
    const fileList = files.map(file => (
        <li key={file.name}> {/* Use file.name instead of file.path */}
            <Button variant="ghost" className='text-red-500 font-bold mr-1' onClick={() => removeFile(file.name)}>X</Button>
            {file.name} - {file.size} bytes
        </li>
    ));

    return (
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
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
                        <ul className="max-w-md space-y-1 text-gray-500 list-inside list-none">{fileList}</ul>
                    </div>
                    <div className="ml-auto mt-auto">
                        <Button variant="outline" onClick={upload} className='mt-auto mb-2 shadow-md' disabled={uploading}>
                            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Submit
                        </Button>
                    </div>
                </div>
            </div>
        </DialogContent>
        </Dialog>
    )
}

export default FileUploadModal