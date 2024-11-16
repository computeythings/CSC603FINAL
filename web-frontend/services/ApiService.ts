// UserService.ts
import axios, { AxiosResponse } from 'axios'
import CustomerData from '@/types/CustomerData'
import CustomerRequest from '@/types/CustomerRequest'

class ApiService {
    // TODO: Pretty sure this is a GET with an encrypted body instead of params
    static getCustomerBySSN(token: string, ssn: string, firstName: string, lastName: string): Promise<CustomerData| null> {
        return this.customerPOST(token, {
            method: 'get',
            ssn: ssn,
            first_name: firstName,
            last_name: lastName
        })
    }

    static getCustomerByID(token: string, uid: string): Promise<CustomerData | null> {
        return axios.get(`/api/v1/users`, {
            headers: {
                Authorization: token,
                'Content-Type': 'application/json'
            },
            params: {
                id: uid,
            },
            })
            .then((response: AxiosResponse) => {
                console.log('GET data:', response.data)
                if (response.status == 200) {
                    if (JSON.stringify(response.data) === '{}')
                        return null
                    return response.data as CustomerData
                }
                throw new Error(response.data) // Ensure the data returned is of type CustomerData
            })
            .catch((error) => {
                console.error('Failed to make the request:', error);
                return null
            })
    }

    static customerPOST(token: string, req: CustomerRequest): Promise<CustomerData | null> {
        return axios.post(`/api/v1/users`, { ...req }, {
            headers: {
                Authorization: token,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            })
            .then((response: AxiosResponse) => {
                console.log('POST data:', response.data)
                if (response.status == 200) {
                    if (JSON.stringify(response.data) === '{}')
                        return null
                    return response.data as CustomerData
                }
                throw new Error(response.data) // Ensure the data returned is of type CustomerData
            })
    }

    // static pdfUpload(token: string, folder: string, filename: string, file: File): Promise<CustomerData> {
    //     const formData = new FormData()
    //     formData.append('file', file)

    //     try {
    //         const response: AxiosResponse = await axios.put(
    //         `${APP_URL_BASE}/api/v1/upload/${folder}/${filename}`,
    //         formData,
    //         {
    //             headers: {
    //             Authorization: token,
    //             'Content-Type': 'multipart/form-data',
    //             Accept: 'application/json',
    //             },
    //         }
    //         )
    //         if (response.status === 200) {
    //         console.log('UPLOAD STATUS: 200 - OK')
    //         } else {
    //         console.log('UPLOAD STATUS:', response.data)
    //         }
    //     } catch (error) {
    //         console.error('Error uploading PDF:', error)
    //     }
    // }
}

export default ApiService
