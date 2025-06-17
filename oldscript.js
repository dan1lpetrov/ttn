
function doGet(e) {
  var page = e.parameter.page;
  
  if (!page) {
    page = 'index';
  }
  
  // Маршрутизація сторінок
  switch(page) {
    case 'index':
      return createIndexPage();
    case 'clients':
      return createClientsPage();
    default:
      return createIndexPage();
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function createIndexPage() {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
      .setTitle('Головна')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createClientsPage() {
  var template = HtmlService.createTemplateFromFile('Clients');
  return template.evaluate()
      .setTitle('Кліенти')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAreas() {
  try {
    const requestData = {
      apiKey: apiKey,
      modelName: "AddressGeneral",
      calledMethod: "getAreas",
      methodProperties: {}
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(requestData)
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    if (!result.success) {
      throw new Error('Failed to get areas');
    }

    return result.data;
  } catch (error) {
    console.log(error);
    throw new Error('Помилка при отриманні списку областей: ' + error.message);
  }
}

function addClient(formData) {
  try {
    console.log('Received form data:', formData);

    // Перевіряємо наявність всіх необхідних даних
    const requiredFields = ['lastName', 'firstName', 'phone', 'cityRef', 'cityName', 'warehouseRef', 'warehouseDescription'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        throw new Error(`Відсутнє обов'язкове поле: ${field}`);
      }
    }

    // Створюємо отримувача в Новій Пошті
    const npResult = createNovaPoshtaRecipient({
      lastName: formData.lastName,
      firstName: formData.firstName,
      middleName: formData.middleName || '',
      phone: formData.phone
    });

    console.log('Nova Poshta recipient creation result:', npResult);

    if (!npResult.success) {
      throw new Error('Помилка створення контрагента: ' + npResult.error);
    }

    // Формуємо дані для запису в таблицю
    const rowData = [
      new Date(),                    // Дата створення
      formData.lastName,             // Прізвище
      formData.firstName,            // Ім'я
      formData.middleName || '',     // По батькові
      formData.phone,                // Телефон
      formData.cityName,             // Назва міста
      formData.cityRef,              // Реф міста
      formData.warehouseDescription, // Назва відділення
      formData.warehouseRef,         // Реф відділення
      npResult.contactRef,           // Реф контактної особи для ТТН
      npResult.counterpartyRef       // Реф контрагента
    ];

    const ss = SpreadsheetApp.openById(spreadsheet_id);
    const sheet = ss.getSheetByName(clientSheet);
    sheet.appendRow(rowData);

    return true;
  } catch (error) {
    console.log('Error in addClient:', error);
    throw new Error('Помилка при додаванні клієнта: ' + error.message);
  }
}

function createWaybill(data) {
  try {
    console.log('Creating waybill with data:', data);
    
    // Отримуємо дані клієнта
    const ss = SpreadsheetApp.openById(spreadsheet_id);
    const clientsSheet = ss.getSheetByName(clientSheet);
    const clientData = clientsSheet.getDataRange().getValues();
    
    // Знаходимо клієнта за ID
    const client = clientData.slice(1).find(row => String(row[9]) === String(data.clientId));

    if (!client) {
      throw new Error(`Клієнта не знайдено. ID: ${data.clientId}`);
    }

    console.log('Found client:', client);

    // Отримуємо дані відправника
    const senderData = getSenderData();
    console.log('Sender data:', senderData);

    const requestData = {
      apiKey: apiKey,
      modelName: "InternetDocument",
      calledMethod: "save",
      methodProperties: {
        PayerType: data.payerType,
        PaymentMethod: "Cash",
        CargoType: data.cargoType,
        Weight: data.weight,
        ServiceType: data.serviceType,
        SeatsAmount: data.seatsAmount,
        Description: data.description,
        Cost: data.cost,
        
        // Дані відправника
        CitySender: senderData.citySender,
        Sender: senderData.sender,
        SenderAddress: senderData.senderAddress,
        ContactSender: senderData.contactSender,
        SendersPhone: senderData.sendersPhone,

        // Дані отримувача з оновленою структурою
        Recipient: client[10],        // Реф контрагента
        ContactRecipient: client[9],  // Реф контактної особи
        CityRecipient: client[6],     // Реф міста
        RecipientAddress: client[8],  // Реф відділення
        RecipientsPhone: client[4]    // Телефон
      }
    };

    console.log('Request data:', requestData);

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(requestData)
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return result.data;
  } catch (error) {
    console.log('Error in createWaybill:', error);
    throw new Error('Помилка при створенні накладної: ' + error.message);
  }
}
const apiKey = "32fd0e539bc8e64648cce78c71042707";
const apiUrl = "https://api.novaposhta.ua/v2.0/json/";
const spreadsheet_id = "1beRw7EbMXCeNm8fzHZzVW5EMex2iTOnssD0QT2YbaWc";
const clientSheet = "клієнти";
const senderSheet = "відправник";

// Функція для отримання даних відправника
function getSenderData() {
  const ss = SpreadsheetApp.openById(spreadsheet_id);
  const sheet = ss.getSheetByName(senderSheet);
  
  return {
    citySender: sheet.getRange('B13').getValue(),
    sender: sheet.getRange('B14').getValue(),
    senderAddress: sheet.getRange('B15').getValue(),
    contactSender: sheet.getRange('B16').getValue(),
    sendersPhone: sheet.getRange('B17').getValue()
  };
}
function searchCities(searchText) {
  try {
    const requestData = {
      apiKey: apiKey,
      modelName: "Address",
      calledMethod: "getCities",
      methodProperties: {
        FindByString: searchText,
        Limit: "20"
      }
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(requestData)
    };

    console.log('Request to NP API:', JSON.stringify(requestData));
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseText = response.getContentText();
    console.log('Response from NP API:', responseText);

    const result = JSON.parse(responseText);

    if (!result.success) {
      console.log('API Error:', result.errors);
      return [];
    }

    // Відсортуйте результат
    return result.data.sort((a, b) => 
      a.Description.localeCompare(b.Description, 'uk')
    );

  } catch (error) {
    console.log('Error in searchCities:', error);
    return [];
  }
}

function getWarehouses(cityRef, cityName) {
  try {
    const requestData = {
      apiKey: apiKey,
      modelName: "AddressGeneral",
      calledMethod: "getWarehouses",
      methodProperties: {
        CityRef: cityRef,
        CityName: cityName,
        Limit: "150"  // Збільшуємо ліміт для отримання всіх відділень
      }
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(requestData)
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    if (!result.success) {
      throw new Error('Failed to get warehouses');
    }

    return result.data;
  } catch (error) {
    console.log(error);
    throw new Error('Помилка при отриманні списку відділень: ' + error.message);
  }
}

function getCityAndWarehouseRefs(cityFullName, postOfficeName) {
    try {
        console.log('Getting refs for:', { cityFullName, postOfficeName });
        // Витягуємо назву міста з дужок з областю
        const cityNameMatch = cityFullName.match(/(.*?)\s*\((.*?)\)/);
        if (!cityNameMatch) {
            throw new Error('Некоректний формат назви міста');
        }
        
        const cityName = cityNameMatch[1].trim(); // Назва міста
        const areaName = cityNameMatch[2].trim(); // Назва області
        
        // Шукаємо місто
        const citySearchResult = searchCities(cityName);
        // Шукаємо місто з відповідною областю
        const city = citySearchResult.find(c => 
            c.Description === cityName && 
            c.AreaDescription === areaName
        );
        
        const cityRef = city ? city.Ref : null;
        
        if (!cityRef) {
            throw new Error('Місто не знайдено');
        }

        // Шукаємо відділення
        const warehouseSearchResult = getWarehouses(cityRef, cityName);
        console.log('Warehouses found:', warehouseSearchResult);
        
        const postOffice = warehouseSearchResult.find(w => w.Description === postOfficeName);
        console.log('Selected warehouse:', postOffice);
        
        const postOfficeRef = postOffice ? postOffice.Ref : null;

        console.log('Final refs:', { cityRef, postOfficeRef });
        return { cityRef, postOfficeRef };
    } catch (error) {
        console.log('Error in getCityAndWarehouseRefs:', error);
        throw new Error('Помилка при отриманні ref-ів: ' + error.message);
    }
}
function createNovaPoshtaRecipient(formData) {
  const payload = {
    apiKey: apiKey,
    modelName: "Counterparty",
    calledMethod: "save",
    methodProperties: {
      FirstName: formData.firstName,
      LastName: formData.lastName,
      MiddleName: formData.middleName || "",
      Phone: formData.phone,
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient"
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());
    
    Logger.log('NP API Response:', result);
    
    if (result.success && result.data && result.data[0]) {
      // Повертаємо об'єкт з обома ref'ами
      return {
        success: true,
        counterpartyRef: result.data[0].Ref,
        contactRef: result.data[0].ContactPerson.data[0].Ref
      };
    } else {
      return {
        success: false,
        error: result.errors ? result.errors.join(", ") : "Невідома помилка"
      };
    }
  } catch (error) {
    Logger.log(`Помилка запиту до Нової Пошти: ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}
function getClients() {
  try {
    console.log('Starting getClients function');
    
    // Перевірка наявності ID таблиці
    if (!spreadsheet_id) {
      throw new Error('spreadsheet_id не визначено');
    }
    console.log('Using spreadsheet_id:', spreadsheet_id);

    // Перевірка наявності назви листа
    if (!clientSheet) {
      throw new Error('clientSheet не визначено');
    }
    console.log('Using sheet name:', clientSheet);

    // Отримання таблиці
    const spreadsheet = SpreadsheetApp.openById(spreadsheet_id);
    if (!spreadsheet) {
      throw new Error('Не вдалося відкрити таблицю');
    }

    // Отримання листа
    const sheet = spreadsheet.getSheetByName(clientSheet);
    if (!sheet) {
      throw new Error(`Лист '${clientSheet}' не знайдено`);
    }

    // Отримання даних
    const range = sheet.getDataRange();
    if (!range) {
      throw new Error('Не вдалося отримати діапазон даних');
    }

    const data = range.getValues();
    console.log('Raw data length:', data.length);

    // Перевірка наявності даних
    if (!data || data.length === 0) {
      console.log('No data found in sheet');
      return [];
    }

    // Якщо є тільки заголовки
    if (data.length === 1) {
      console.log('Only headers found in sheet');
      return [];
    }

    // Обробка даних
    const clients = data.slice(1)
      .filter(row => row[1] && row[1].toString().trim() !== '') // Перевіряємо наявність прізвища
      .map(row => {
        const client = {
          date: row[0] instanceof Date ? row[0].toISOString() : new Date(row[0]).toISOString(),
          lastName: row[1]?.toString().trim() || '',
          firstName: row[2]?.toString().trim() || '',
          middleName: row[3]?.toString().trim() || '',
          phone: row[4]?.toString().trim() || '',
          city: row[5]?.toString().trim() || '',
          cityRef: row[6]?.toString().trim() || '',
          warehouse: row[7]?.toString().trim() || '',
          warehouseRef: row[8]?.toString().trim() || '',
          contactRef: row[9]?.toString().trim() || '',
          counterpartyRef: row[10]?.toString().trim() || ''
        };
        
        console.log('Processed client:', client);
        return client;
      });

    console.log(`Returning ${clients.length} clients`);
    // Перевірка результату перед поверненням
    if (!Array.isArray(clients)) {
      throw new Error('Помилка обробки даних: результат не є масивом');
    }

    return clients;

  } catch (error) {
    console.error('Error in getClients:', error);
    // Перекидаємо помилку наверх для обробки
    throw new Error(`Помилка отримання списку клієнтів: ${error.message}`);
  }
}