import { toast } from 'react-toastify';
import Config from "../Config";
import axios from 'axios';

let headers = { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
if (process.env.REACT_APP_ENV == 'dev') {
  headers['Authorization'] = Config.token
} else {
  headers['X-Frappe-CSRF-Token'] = window?.frappe?.csrf_token
}
const axiosAPI = axios.create({
  baseURL: Config.apiURL,
  headers: headers
});

export function apiPostCall(path, params) {
  return axiosAPI.post(path, params)
    .then((response) => {
      return response.data
    })
    .catch((error) => {
      let errors = null
      if (error.response) {
        errors = error.response
      } else if (error.request) {
        errors = error.request
      } else {
        errors = error.message
      }
      toast.error(errors.statusText);
    });
}

export function uploadImgApi(file, token) {
  const data = new FormData();
  data.append('files', file);
  return fetch(`${Config.apiBaseUrl}/file/upload`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      authorization: token,
    },
    body: data,
  })
    .then(response => response.json())
    .then(responseJson => {
      if (responseJson) {
        return `${responseJson.data[0].url}`
      }
      return null
    }).catch(error => {
      return error;
    });
}