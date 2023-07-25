import fetch, { RequestInit as NodeRequestInit, Response, HeadersInit } from 'node-fetch'

/**
 * Custom type for fetch options
 */
type RequestInit = NodeRequestInit & {
    headers?: HeadersInit & {
        'Content-Type'?: string
    }
}

/**
 * Custom type for better error handling
 */
type FetchError = {
    type: 'fetch-error' | 'api-error' | 'parsing-error'
    message: string
}

/**
 * An asynchronous function that wraps the native fetch function providing enhanced error handling.
 * Automatically includes 'Content-Type': 'application/json' header, but also allows other headers to be included optionally.
 *
 * @template T The expected return type.
 * @param {string} url The URL you want to fetch.
 * @param {RequestInit} [options] The options you want to pass to the fetch function.
 * @returns {Promise<T>} Returns a Promise that resolves with the result of the fetch operation.
 * @throws {FetchError} Throws an error if there is a network, API or parsing error.
 */
export const doFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
    const requestOptions: RequestInit = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    }

    let response: Response
    try {
        response = await fetch(url, requestOptions)
    } catch (error) {
        throw { type: 'fetch-error', message: 'Network error, unable to fetch' } as FetchError
    }

    if (!response.ok) {
        let errMsg: string
        try {
            const errBody = (await response.json()) as any
            errMsg = errBody.error || response.statusText
        } catch (e) {
            errMsg = response.statusText
        }
        throw { type: 'api-error', message: errMsg } as FetchError
    }

    let data: T
    try {
        data = (await response.json()) as T
    } catch (error) {
        throw {
            type: 'parsing-error',
            message: 'Parsing error, could not parse fetch response',
        } as FetchError
    }

    return data
}


// Example Usage
/*
// GET request
try {
  const data = await doFetch<any>('https://api.example.com/resource');
  console.log(data);
} catch (error: unknown) {
  const err = error as FetchError;
  console.error(`GET Error: ${err.message}`);
}

// POST request
try {
  const postData = { key: 'value' };
  const data = await doFetch<any>('https://api.example.com/resource', {
    method: 'POST',
    body: JSON.stringify(postData),
  });
  console.log(data);
} catch (error: unknown) {
  const err = error as FetchError;
  console.error(`POST Error: ${err.message}`);
}

// PUT request
try {
  const putData = { key: 'newValue' };
  const data = await doFetch<any>('https://api.example.com/resource/1', {
    method: 'PUT',
    body: JSON.stringify(putData),
  });
  console.log(data);
} catch (error: unknown) {
  const err = error as FetchError;
  console.error(`PUT Error: ${err.message}`);
}

// DELETE request
try {
  const data = await doFetch<any>('https://api.example.com/resource/1', {
    method: 'DELETE',
  });
  console.log(data);
} catch (error: unknown) {
  const err = error as FetchError;
  console.error(`DELETE Error: ${err.message}`);
}

*/