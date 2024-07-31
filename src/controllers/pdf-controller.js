require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { notifyClients } = require("../middlewares/websocket");
const createError = require("../utils/create-error");
const mainFolder = process.env.LOCATION_FILE;

const sanitizeFolderName = (folderName) => {
  return folderName.replace(/\\/g, "/");
};

// ฟังก์ชันเพื่อแปลงขนาดไฟล์ให้เป็นรูปแบบที่อ่านง่าย
const formatFileSize = (bytes) => {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${Math.round(bytes / Math.pow(1024, i), 2)} ${sizes[i]}`;
};

// ฟังก์ชันเพื่อแปลงวันที่ให้เป็นรูปแบบที่อ่านง่าย
const formatDate = (date) => {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(date).toLocaleDateString("th-TH", options);
};

const getAllPdfFiles = (dir, filesArray) => {
  const files = fs.readdirSync(dir);
  filesArray = filesArray || [];

  files.forEach((file) => {
    const filePath = path.join(dir, file);

    if (fs.statSync(filePath).isDirectory()) {
      filesArray = getAllPdfFiles(filePath, filesArray);
    } else if (path.extname(filePath) === ".pdf" || path.extname(filePath) === ".xlsx" || path.extname(filePath) === ".doc") {
      const relativeFolder = path.relative(mainFolder, dir);
      const stats = fs.statSync(filePath);

      filesArray.push({
        folder: sanitizeFolderName(relativeFolder),
        folderYear: dir.split("\\")[2],
        folderMomth: dir.split("\\")[3].replace(/[.0-9]/g, ""),
        fileName: file,
        size: formatFileSize(stats.size),
        created: stats.birthtime.getTime(),
        modified: stats.mtime.getTime(),
      });
    }
  });

  return filesArray;
};

const getFolderYear = (folDer) => {
  const folderYears = [];
  const files = fs.readdirSync(folDer);

  files.forEach((folderName) => {
    const folderPath = path.join(folDer, folderName);
    const stat = fs.statSync(folderPath);

    if (stat.isDirectory()) {
      // ตรวจสอบว่าชื่อโฟลเดอร์ขึ้นต้นด้วย "สแกนปี"
      if (folderName.startsWith("สแกนปี")) {
        // เพิ่มข้อมูลโฟลเดอร์ปีลงในอาร์เรย์
        folderYears.push({
          folderYear: folderName,
          created: formatDate(stat.birthtime),
          modified: formatDate(stat.mtime),
        });
      }
    }
  });

  return folderYears;
};

const getFolderInFolder = (folDer) => {
  const folderYears = [];
  try {
    const files = fs.readdirSync(folDer);

    files.forEach((folderName) => {
      const folderPath = path.join(folDer, folderName);
      const stat = fs.statSync(folderPath);

      if (stat.isDirectory()) {
        // เพิ่มข้อมูลโฟลเดอร์ปีลงในอาร์เรย์
        folderYears.push({
          folderMain: folDer.split('\\')[2],
          folder: folderName,
          created: formatDate(stat.birthtime),
          modified: formatDate(stat.mtime),
        });
      }
    });

    return folderYears;
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error("ไม่พบโฟล์เดอร์ที่ต้องการ");
    } else {
      console.error("เกิดข้อผิดพลาดในการอ่านไฟล์ :", err);
    }
    return null
  }
};

exports.getNewFile = async (req, res, next) => {
  try {
    // Get all PDF files
    let allFiles = getAllPdfFiles(mainFolder);

    // Sort files by modified date in descending order
    allFiles.sort((a, b) => {
      const dateA = new Date(a.created);
      const dateB = new Date(b.created);
      return dateB - dateA;
    });

    // Get the latest 10 files
    const latestFiles = allFiles.slice(0, 18);

    // Prepare the response data
    const fileNew = latestFiles.map(file => ({
      folder: file.folder,
      folderYear: file.folderYear,
      folderMonth: file.folderMonth,
      fileName: file.fileName,
      size: file.size,
      created: file.created,
      modified: file.modified,
    }));

    // Send JSON response with the latest files
    res.json({ result: "success", files: latestFiles, count: latestFiles.length});
  } catch (err) {
    next(err);
  }
}

exports.getApiPDF = async (req, res, next) => {
  try {
    const searchQuery = req.query.search ? req.query.search.toLowerCase() : "";
    const monthQuery = req.query.month ? req.query.month.toLowerCase() : "";
    const yearQuery = req.query.year ? req.query.year.toLowerCase() : "";
    let allFiles = getAllPdfFiles(mainFolder);

    // กรองตามชื่อไฟล์
    if (searchQuery) {
      allFiles = allFiles.filter((file) =>
        file.fileName.toLowerCase().includes(searchQuery)
      );
    }

    // กรองตามเดือน
    if (monthQuery) {
      allFiles = allFiles.filter((file) => {
        const folderParts = file.folder.split("/"); // ลบ / ออก
        const monthPart = folderParts[folderParts.length - 1].split(".")[0]; // ในกรนี้ที่ชื่อโฟล์เดอร์เป็น กพ.67
        const monthAndYearPart = folderParts[folderParts.length - 1]; // ในกรนี้ที่ชื่อโฟล์เดอร์เป็น พค67
        return (
          monthPart.toLowerCase() === monthQuery ||
          monthAndYearPart.startsWith(monthQuery)
        ); // ปรับให้ตัวเล็กหมดแล้วเช็คว่าเป็น แบบ ตัวที่ 1 หรือ ตัวที่ 2
      });
    }

    // กรองตามปี
    if (yearQuery) {
      allFiles = allFiles.filter((file) => {
        const folderParts = file.folder.split("/"); // ลบ / ออก
        const yearPart = folderParts.find((part) => part.startsWith("สแกนปี")); // เอาคำที่ขึ้นต้นด้วย "สแกนปี"
        if (yearPart) {
          const extractedYear = yearPart.replace("สแกนปี", "");
          return extractedYear && extractedYear.toLowerCase() === yearQuery;
        }
        return false;
      });
    }

    if (allFiles.length === 0) {
      return res
        .status(400)
        .json({ result: "error", message: "ไม่พบไฟล์ในระบบ" });
    }

    res.json({
      result: "success",
      files: allFiles,
    //   yearFolder,
      count: allFiles.length,
    });
  } catch (err) {
    next(err);
    console.log(err);
  }
};

exports.getFolderYear = (req, res, next) => {
  try {
    const yearFolder = getFolderYear(mainFolder);
    res.json({ result: "success", yearFolder, count: yearFolder.length });
  } catch (err) {
    next(err);
    console.log(err);
  }
};

exports.getFolderMonth = (req, res, next) => {
  try {
    const { year } = req.params;

    if (!year.startsWith("สแกนปี")) {
      return createError(400, "ข้อมูลปีไม่ถูกต้อง");
    }

    const yearFolder = path.join(mainFolder, year);
    const yearInFolder = getFolderInFolder(yearFolder);

    if (!yearInFolder) {
      return res.status(400).json({
        result: "error",
        message: `ไม่พบโฟล์เดอร์ ${year} โปรดตรวจสอบใหม่!`,
      });
    }

    res.json({ result: "success", yearInFolder, count: yearInFolder.length });
  } catch (err) {
    next(err);
    console.log(err);
  }
};

exports.getShowPDF = async (req, res, next) => {
  try {
    let folderPath = req.params[0];
    const lastSlashIndex = folderPath.lastIndexOf("/");
    const folderName = folderPath.slice(0, lastSlashIndex);
    const fileName = folderPath.slice(lastSlashIndex + 1);

    const folderNameDecoded = decodeURIComponent(folderName);
    const fileNameDecoded = decodeURIComponent(fileName);

    const filePath = path.resolve(
      mainFolder,
      sanitizeFolderName(folderNameDecoded),
      fileNameDecoded
    );

    if (fs.existsSync(filePath) && path.extname(filePath) === ".pdf" || path.extname(filePath) === ".xlsx" || path.extname(filePath) === ".doc") {
      res.sendFile(filePath);
    } else {
      res.status(400).json({ result: "error", message: "ไม่พบไฟล์ในระบบ" });
    }
  } catch (err) {
    next(err);
    console.log(err);
  }
};

exports.postApiPDF = async (req, res, next) => {
  try {

    const { date, duplicate, tagfile, copy } = req.body;
    const files = req.files;

    const fileDates = req.body.lastModified ? JSON.parse(req.body.lastModified) : [];

    let year, thMonth;

    if (date.includes('-') && date.split('-').length === 2) {
      year = (Number(date.split("-")[0]) + 543).toString().slice(2);
      const month = date.split("-")[1];
      const thaiMonth = ["มค", "กพ", "มีค", "เมย", "พค", "มิย", "กค", "สค", "กย", "ตค", "พย", "ธค"];
      thMonth = thaiMonth[Number(month) - 1];
    } else if (date.includes('.')) {
      year = date.split('.')[1];
      thMonth = date.split('.')[0];
    } else if (date.includes('/')) {
      year = date.split("/")[1];
      thMonth = date.split("/")[0];
    }

    if (!date || !files || files.length === 0) {
      return res.status(400).json({ result: "error", message: "กรุณาป้อนข้อมูลให้ครบ" });
    }

    const existingFiles = getAllPdfFiles(mainFolder);

    // เช็คว่ามีไฟล์ซ้ำมัย ถ้ามีก็นำมาสร้างเป็น Array
    const duplicateFiles = files.filter((file) =>
      existingFiles.some(
        (f) => f.fileName.toLowerCase() === decodeURIComponent(file.originalname.toLowerCase())
      )
    );

    const nonDuplicateFiles = files.filter((file) =>
      !existingFiles.some(
        (f) => f.fileName.toLowerCase() === decodeURIComponent(file.originalname.toLowerCase())
      )
    );

    // สร้างและเช็คข้อมูลโฟล์เดอร์และไฟล์
    const yearFolder = path.join(mainFolder, `สแกนปี${year}`);

    // ตรวจสอบและสร้างโฟลเดอร์หลักก่อน
    if (!fs.existsSync(yearFolder)) {
      fs.mkdirSync(yearFolder, { recursive: true });
    }

    // ตรวจสอบว่าโฟลเดอร์เดือนมีอยู่หรือไม่
    const thaiMonthRegex = new RegExp(`^${thMonth.replace(".", "\\.")}\\d{2}$`);
    const existingMonthFolder = fs.readdirSync(yearFolder).find(folder => thaiMonthRegex.test(folder));

    const monthFolder = existingMonthFolder ? 
      path.join(yearFolder, existingMonthFolder) : 
      path.join(yearFolder, `${thMonth}.${year}`);

    // ตรวจสอบและสร้างโฟลเดอร์ย่อย
    if (!fs.existsSync(monthFolder)) {
      fs.mkdirSync(monthFolder, { recursive: true });
    }

    // ไม่มีไฟล์ที่ซ้ำ
    nonDuplicateFiles.forEach((file, index) => {
      const fileName = decodeURIComponent(file.originalname.trim());
      const filePath = path.join(monthFolder, fileName);

      fs.writeFileSync(filePath, file.buffer);

      const lastModified = fileDates[index];
      if (lastModified) {
        const lastModifiedDate = new Date(lastModified);
        fs.utimesSync(filePath, new Date(), lastModifiedDate);
      }

      const message = `มีไฟล์ *${decodeURIComponent(file.originalname)}* ได้ถูกอัพโหลดเข้าสู่ระบบ`;
      notifyClients(message);
    });

    // อัพโหลดไฟล์ซ้ำแบบ เติมข้อความคำว่า -copy
    if (duplicateFiles.length > 0 && copy === "true" && duplicate === "false") {
      duplicateFiles.forEach((file, index) => {
        try {
          const originalName = decodeURIComponent(file.originalname.trim());
          const fileName = originalName.substring(0, originalName.lastIndexOf('.'));
          const fileType = originalName.substring(originalName.lastIndexOf('.') + 1);
    
          let copyIndex = 1;
          let fullNameFile = `${fileName}-copy.${fileType}`;
          let filePath = path.join(monthFolder, fullNameFile);
    
          // เช็คว่ามีไฟล์ที่ -copy อยู่มั้ย ถ้ามีก็เติมตัวเลขเข้าไป
          while (fs.existsSync(filePath)) {
            fullNameFile = `${fileName}-copy (${copyIndex}).${fileType}`;
            filePath = path.join(monthFolder, fullNameFile);
            copyIndex++;
          }
    
          fs.writeFileSync(filePath, file.buffer);
    
          const lastModified = fileDates[index];
          if (lastModified) {
            const lastModifiedDate = new Date(lastModified);
            fs.utimesSync(filePath, new Date(), lastModifiedDate);
          }
    
          const message = `มีไฟล์ *${originalName}* ได้ถูกอัพโหลดเข้าสู่ระบบ`;
          notifyClients(message);
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      });
    }

     // อัพโหลดไฟล์ซ้ำแบบ เติมข้อความคำว่า -# แท็กไฟล์ตามที่ต้องการ
     if (duplicateFiles.length > 0 && copy === "false" && duplicate === "false" && tagfile !== "undefined") {
      duplicateFiles.forEach((file, index) => {
        try {
          const originalName = decodeURIComponent(file.originalname.trim());
          const fileName = originalName.substring(0, originalName.lastIndexOf('.'));
          const fileType = originalName.substring(originalName.lastIndexOf('.') + 1);
    
          let copyIndex = 1;
          let fullNameFile = `${fileName}-#${tagfile}.${fileType}`;
          let filePath = path.join(monthFolder, fullNameFile);
    
          // เช็คว่ามีไฟล์ที่ -copy อยู่มั้ย ถ้ามีก็เติมตัวเลขเข้าไป
          while (fs.existsSync(filePath)) {
            fullNameFile = `${fileName}-#${tagfile} (${copyIndex}).${fileType}`;
            filePath = path.join(monthFolder, fullNameFile);
            copyIndex++;
          }
    
          fs.writeFileSync(filePath, file.buffer);
    
          const lastModified = fileDates[index];
          if (lastModified) {
            const lastModifiedDate = new Date(lastModified);
            fs.utimesSync(filePath, new Date(), lastModifiedDate);
          }
    
          const message = `มีไฟล์ *${originalName}* ได้ถูกอัพโหลดเข้าสู่ระบบ`;
          notifyClients(message);
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      });
    }

    // เช็คข้อมูลไฟล์ซ้ำ
    if (duplicateFiles.length > 0 && (!copy || copy === undefined) && (!duplicate || duplicate === undefined) && (tagfile === null || tagfile === undefined)) {
      const duplicateFileNames = duplicateFiles.map((file) => {
        const existingFile = existingFiles.find(
          (f) => f.fileName.toLowerCase() === decodeURIComponent(file.originalname.toLowerCase())
        );

        return {
          folder: existingFile.folder,
          fileName: decodeURIComponent(file.originalname),
          size: formatFileSize(file.size),
        };
      });

      return res.status(400).json({
        result: "error",
        message: "มีข้อมูลชุดนี้อยู่ในระบบแล้ว",
        duplicateFiles: duplicateFileNames,
        status: "duplicate"
      });
    } else {
      return res.status(200).json({
        result: "success",
        message: "อัพโหลดไฟล์เสร็จสิ้น",
        status: "uploaded"
      });
    }
  } catch (err) {
    next(err);
    console.log(err);
  }
};

exports.renameApiPDF = async (req, res, next) => {
  try {
    const { folderPath, oldFileName, newFileName, request } = req.body

    if (!folderPath) {
      return next(createError(400, "ไม่พบข้อมูลโฟลเดอร์"));
    } else if (!oldFileName) {
      return next(createError(400, "ไม่พบข้อมูลชื่อเดิมของไฟล์"));
    } else if (!newFileName) {
      return next(createError(400, "ไม่พบข้อมูลชื่อที่เปลี่ยน"));
    } else if (!request) {
      return next(createError(400, "ไม่พบความต้องการที่แจ้งมา"));
    }

    const spacielString = /[\\/:?<>|*]/;

    if(spacielString.test(newFileName)){
      return next(createError(400, "ไม่สามารถเปลี่ยนชื่อไฟล์ได้ เนื่องจากมีอักษรพิเศษ : / ? < > | *"))
    }

    // สร้างพาธไฟล์เก่าและไฟล์ใหม่
    const oldFilePath = path.join(mainFolder, sanitizeFolderName(folderPath), decodeURIComponent(oldFileName));
    const newFilePath = path.join(mainFolder, sanitizeFolderName(folderPath), decodeURIComponent(newFileName));

    if (!fs.existsSync(oldFilePath)) {
      return next(createError(400, "ไม่พบไฟล์เก่าในระบบ"));
    }

    fs.renameSync(oldFilePath, newFilePath);

    res.json({ result: "success", message: `เปลี่ยนชื่อไฟล์เป็น ${newFileName} เรียบร้อยแล้ว` });

    // ส่งการแจ้งเตือน
    const message = `เปลี่ยนชื่อไฟล์เป็น *${newFileName}* เรียบร้อยแล้ว`;
    notifyClients(message);

  }catch(err){
    next(err)
    console.log(err)
  }
}

exports.deleteApiPDF = async (req, res, next) => {
  try {
    let folderPath = req.params[0];
    const lastSlashIndex = folderPath.lastIndexOf("/");
    const folderName = folderPath.slice(0, lastSlashIndex);
    const fileName = folderPath.slice(lastSlashIndex + 1);

    const folderNameDecoded = decodeURIComponent(folderName);
    const fileNameDecoded = decodeURIComponent(fileName);

    const filePath = path.resolve(
      mainFolder,
      sanitizeFolderName(folderNameDecoded),
      fileNameDecoded
    );

    if (fs.existsSync(filePath) && path.extname(filePath) === ".pdf" || path.extname(filePath) === ".doc" || path.extname(filePath) === ".xlsx") {
      fs.unlinkSync(filePath);
      res.json({
        result: "success",
        message: `ลบไฟล์ ${fileNameDecoded} ออกจากระบบเรียบร้อยแล้ว`,
      });

      const message = `ลบไฟล์ ${fileNameDecoded} ออกจากระบบเรียบร้อยแล้ว`
      notifyClients(message, fileNameDecoded)
    } else {
      res.status(400).json({ result: "error", message: "ไม่พบไฟล์ในระบบ" });
    }
  } catch (err) {
    next(err);
    console.log(err);
  }
};
