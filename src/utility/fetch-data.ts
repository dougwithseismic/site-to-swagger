import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Makes an HTTP request using the GET method and retrieves the response data of the specified type.
 *
 * @param url - The URL to make the request to.
 * @param options - Optional request options.
 * @returns A promise that resolves to the response data of the specified type.
 * @throws An error if the request fails or the response status is not OK.
 */
const fetchDataGet = async <T>(url: string, options?: AxiosRequestConfig): Promise<T> => {
  return fetchData<T>(url, 'GET', options);
};

/**
 * Makes an HTTP request using the POST method and retrieves the response data of the specified type.
 *
 * @param url - The URL to make the request to.
 * @param data - The request body data.
 * @param options - Optional request options.
 * @returns A promise that resolves to the response data of the specified type.
 * @throws An error if the request fails or the response status is not OK.
 */
const fetchDataPost = async <T>(
  url: string,
  data?: any,
  options?: AxiosRequestConfig
): Promise<T> => {
  return fetchData<T>(url, 'POST', {
    ...options,
    data: data,
  });
};

/**
 * Makes an HTTP request and retrieves the response data of the specified type.
 *
 * @param url - The URL to make the request to.
 * @param method - The HTTP method (GET, POST, etc.) for the request.
 * @param options - Optional request options.
 * @returns A promise that resolves to the response data of the specified type.
 * @throws An error if the request fails or the response status is not OK.
 */
const fetchData = async <T>(
  url: string,
  method: HttpMethod,
  options?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await axios.request({
      url: url,
      method: method,
      ...options,
    });

    // Check if the response is successful
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    // Extract the response data
    const responseData: T = response.data;
    return responseData;
  } catch (error: unknown) {
    // Handle any errors that occur during the request
    throw new Error(`Request failed: ${error}`);
  }
};

export default {
  get: fetchDataGet,
  post: fetchDataPost,
};
