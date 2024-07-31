
const diskinfo = require("node-disk-info");

exports.getDiskInfo = async (req, res, next) => {
  try {

    const disks = await diskinfo.getDiskInfo();

    const disk = disks[1];

    const formatFileSize = (bytes) => {
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        if (bytes === 0) return "0 Byte";
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return `${Math.round(bytes / Math.pow(1024, i), 2)} ${sizes[i]}`;
      };

      const storage = {
        free: formatFileSize(disk.available),
        used: formatFileSize(disk.used),
        size: formatFileSize(disk.blocks),
        usedPer: disk.capacity, 
        path: disk.mounted.split(':')[0]
      }

    res.json({
        result: "success!",
        storage,
    });
  } catch (err) {
    next(err);
    console.log(err);
  }
};
