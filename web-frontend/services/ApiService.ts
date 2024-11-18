// UserService.ts
import axios, { AxiosResponse } from 'axios'
import CustomerData from '@/types/CustomerData'
import CustomerRequest from '@/types/CustomerRequest'

class ApiService {
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

    static uploadFiles(token:string, files: File[]): Promise<CustomerData | null> {
        // Create a new FormData object to hold the files
        const formData = new FormData();
      
        // Append all files to FormData
        files.forEach(file => {
          formData.append('files[]', file); // Use 'files[]' to handle multiple files
        });
      
        // Make the POST request to the API endpoint
        return axios.post('/api/v1/upload', formData, {
            headers: {
                Authorization: token,
                'Content-Type': 'multipart/form-data',
                Accept: 'application/json',
            }
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
}

export default ApiService
