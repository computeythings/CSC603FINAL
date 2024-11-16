interface CustomerRequest {
    method: 'get' | 'add' | 'modify' | 'delete';
    id?: string;
    ssn?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
}

export default CustomerRequest