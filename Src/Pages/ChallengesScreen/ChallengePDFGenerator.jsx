import React from 'react';
import {Alert, PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export class ChallengePDFGenerator {
  static async requestStoragePermission() {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 30) return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'App needs storage access to save PDF files.',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return true;
    }
  }

  static async notifyMediaStore(filePath) {
    try {
      if (Platform.OS === 'android') {
        const {NativeModules} = require('react-native');
        if (NativeModules.MediaScannerConnection) {
          await NativeModules.MediaScannerConnection.scanFile(filePath);
        }
      }
    } catch (error) {
      console.log('MediaStore notification failed:', error.message);
    }
  }

  static generateHTMLContent(challenge, completedDays) {
    const completedCount = Object.keys(completedDays).filter(
      day => completedDays[day]?.completed,
    ).length;

    const progressPercentage = Math.round(
      (completedCount / challenge.number_of_days) * 100,
    );
    const startDate = new Date(challenge.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + challenge.number_of_days - 1);

    const formatDate = dateString => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    };

    // Dynamic columns based on total days for optimal page usage
    const getOptimalColumns = totalDays => {
      if (totalDays <= 30) return 5; // 5 columns for smaller challenges
      if (totalDays <= 60) return 6; // 6 columns for medium challenges
      if (totalDays <= 100) return 8; // 8 columns for larger challenges (increased from 7)
      return 9; // 9 columns for very large challenges (increased from 8)
    };

    // Generate day cards in dynamic grid to fill page optimally
    const generateDaysGrid = () => {
      let daysHTML = '';
      const daysPerRow = getOptimalColumns(challenge.number_of_days);

      for (let i = 0; i < challenge.number_of_days; i++) {
        const dayNumber = i + 1;
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const isCompleted = completedDays[dayNumber]?.completed || false;

        if (i % daysPerRow === 0) {
          daysHTML += '<div class="days-row">';
        }

        daysHTML += `
          <div class="day-card ${
            isCompleted ? 'completed' : ''
          }" data-day="${dayNumber}">
            <div class="day-label">DAY</div>
            <div class="day-number">${dayNumber}</div>
            ${isCompleted ? '<div class="check-icon">✓</div>' : ''}
          </div>
        `;

        if ((i + 1) % daysPerRow === 0 || i === challenge.number_of_days - 1) {
          // Fill remaining spaces in row for alignment
          const remainingCells = daysPerRow - ((i % daysPerRow) + 1);
          for (let j = 0; j < remainingCells; j++) {
            daysHTML += '<div class="day-card empty"></div>';
          }
          daysHTML += '</div>';
        }
      }

      return daysHTML;
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${challenge.name} - Challenge Tracker</title>
        <style>
          @page { 
            size: A4; 
            margin: 8mm; 
          }
          
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          body { 
            font-family: 'Arial', sans-serif; 
            background-color: #ffffff;
            color: #333;
            font-size: 10px;
            line-height: 1.4;
          }
          
          .container {
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background-color: #ffffff;
          }
          
          /* Header Section - Reduced padding for more space */
          .header-section {
            background: linear-gradient(135deg, #151B73 0%, #1e2a8a 100%);
            color: white;
            padding: 20px 15px;
            margin-bottom: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(21, 27, 115, 0.3);
            display: flex;
            align-items: center;
            min-height: 70px;
          }
          
          .top-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }
          
          .start-date, .end-date {
            font-size: 14px;
            font-weight: 600;
            color: #333333;
            background-color: #ffffff;
            padding: 8px 12px;
            border-radius: 8px;
            min-width: 70px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 35px;
          }
          
          .center-info {
            flex: 1;
            text-align: center;
            padding: 0 25px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          
          .challenge-title {
            font-size: 16px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 6px;
            line-height: 1.3;
          }
          
          .days-count {
            font-size: 13px;
            font-weight: 600;
            color: #c7d2fe;
          }
          
          /* Days Container - Optimized spacing */
          .days-container {
            flex: 1;
            margin-bottom: 15px;
            padding: 0 3px;
            background-color: #ffffff;
          }
          
          .days-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            gap: 6px;
            width: 100%;
          }
          
          /* Dynamic Day Cards - Smaller width, better spacing */
          .day-card {
            background-color: #F8F9FA;
            border-radius: 10px;
            flex: 1;
            min-height: 55px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            border: 2px solid #E8E8E8;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
            margin: 0 1px;
            padding: 6px 3px;
            max-width: calc((100% - 72px) / 9);
          }
          
          .day-card.completed {
            background: linear-gradient(135deg, #151B73 0%, #1e2a8a 100%);
            border-color: #151B73;
            box-shadow: 0 3px 8px rgba(21, 27, 115, 0.2);
          }
          
          .day-card.empty {
            background: transparent;
            border: none;
            box-shadow: none;
            visibility: hidden;
          }
          
          .day-label {
            font-size: 8px;
            font-weight: 600;
            color: #666666;
            text-align: center;
            margin-bottom: 1px;
            letter-spacing: 0.3px;
          }
          
          .day-card.completed .day-label {
            color: #c7d2fe;
          }
          
          .day-number {
            font-size: 14px;
            font-weight: 900;
            color: #333333;
            text-align: center;
            line-height: 1;
          }
          
          .day-card.completed .day-number {
            color: #ffffff;
          }
          
          .check-icon {
            position: absolute;
            top: 2px;
            right: 4px;
            font-size: 10px;
            color: #ffffff;
            font-weight: bold;
            background-color: rgba(255,255,255,0.2);
            border-radius: 50%;
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* Responsive adjustments for different day counts */
          ${
            challenge.number_of_days <= 30
              ? `
            .day-card {
              min-height: 70px;
              padding: 8px 5px;
              max-width: calc((100% - 25px) / 5);
            }
            .days-row {
              margin-bottom: 10px;
              gap: 5px;
            }
            .day-number {
              font-size: 20px;
            }
            .day-label {
              font-size: 10px;
            }
          `
              : challenge.number_of_days <= 60
              ? `
            .day-card {
              min-height: 60px;
              padding: 7px 4px;
              max-width: calc((100% - 30px) / 6);
            }
            .days-row {
              margin-bottom: 10px;
              gap: 5px;
            }
            .day-number {
              font-size: 18px;
            }
            .day-label {
              font-size: 9px;
            }
          `
              : challenge.number_of_days <= 100
              ? `
            .day-card {
              min-height: 50px;
              padding: 5px 3px;
              max-width: calc((100% - 48px) / 8);
            }
            .days-row {
              margin-bottom: 8px;
              gap: 6px;
            }
            .day-number {
              font-size: 14px;
            }
            .day-label {
              font-size: 8px;
            }
          `
              : `
            .day-card {
              min-height: 45px;
              padding: 4px 2px;
              max-width: calc((100% - 54px) / 9);
            }
            .days-row {
              margin-bottom: 6px;
              gap: 6px;
            }
            .day-number {
              font-size: 12px;
            }
            .day-label {
              font-size: 7px;
            }
          `
          }
          
          /* Why Section - Compact but visible */
          .why-section {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 12px;
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            margin-top: auto;
            margin-bottom: 10px;
          }
          
          .why-text {
            font-size: 14px;
            color: #4a5568;
            line-height: 1.4;
            text-align: center;
            font-family: 'OpenSans-Bold';
          }
          
          /* Footer - Minimal */
          .footer {
            text-align: center;
            color: #999999;
            font-size: 8px;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #e0e0e0;
            background-color: #ffffff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header Section - Optimized -->
          <div class="header-section">
            <div class="top-row">
              <div class="start-date">
                ${formatDate(challenge.start_date)}
              </div>
              
              <div class="center-info">
                <div class="challenge-title">${challenge.name}</div>
                <div class="days-count">${challenge.number_of_days} days</div>
              </div>
              
              <div class="end-date">
                ${formatDate(endDate)}
              </div>
            </div>
          </div>

          <!-- Days Container - Better spacing -->
          <div class="days-container">
            ${generateDaysGrid()}
          </div>

          <!-- Why Section - Protected space -->
          ${
            challenge.why
              ? `
            <div class="why-section">
              <div class="why-text">
                ${challenge.why}
              </div>
            </div>
          `
              : ''
          }
          
        </div>
      </body>
      </html>
    `;
  }

  static async generateChallengePDF(challenge, completedDays) {
    try {
      console.log('Starting PDF generation...');

      const RNHTMLtoPDF = require('react-native-html-to-pdf');

      const hasPermission = await this.requestStoragePermission();
      if (
        !hasPermission &&
        Platform.OS === 'android' &&
        Platform.Version < 30
      ) {
        Alert.alert(
          'Permission Required',
          'Storage permission is needed to save PDF files.',
        );
        return null;
      }

      const timestamp = Date.now();
      const fileName = `${challenge.name.replace(
        /[^a-zA-Z0-9]/g,
        '_',
      )}_Challenge_${timestamp}.pdf`;
      const htmlContent = this.generateHTMLContent(challenge, completedDays);

      const options = {
        html: htmlContent,
        fileName: fileName,
        width: 595, // A4 width
        height: 842, // A4 height
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
        bgColor: '#FFFFFF',
      };

      const pdf = await RNHTMLtoPDF.generatePDF(options);

      if (pdf && pdf.filePath) {
        console.log('PDF generated at:', pdf.filePath);

        try {
          const readableFileName = `${challenge.name.replace(
            /[^a-zA-Z0-9]/g,
            '_',
          )}_Challenge_${new Date()
            .toLocaleDateString('en-US')
            .replace(/\//g, '-')}.pdf`;
          const publicPath = `${RNFS.DownloadDirectoryPath}/${readableFileName}`;

          await RNFS.copyFile(pdf.filePath, publicPath);
          await this.notifyMediaStore(publicPath);

          console.log('PDF copied to public Downloads:', publicPath);

          Alert.alert(
            'PDF Downloaded Successfully!',
            `Your challenge tracker has been saved:\n\n${readableFileName}`,
            [
              {text: 'OK', style: 'default'},
              {
                text: 'Share',
                style: 'default',
                onPress: () => this.sharePDF(publicPath, challenge.name),
              },
            ],
          );

          return publicPath;
        } catch (copyError) {
          console.log(
            'Could not copy to Downloads, trying share instead:',
            copyError.message,
          );
          await this.sharePDF(pdf.filePath, challenge.name);
          return pdf.filePath;
        }
      } else {
        throw new Error('PDF generation failed - no file path returned');
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      Alert.alert('Error', `Failed to generate PDF: ${error.message}`);
      return null;
    }
  }

  static async sharePDF(filePath, challengeName) {
    try {
      console.log('Sharing PDF from:', filePath);

      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('PDF file not found');
      }

      const shareOptions = {
        title: 'Share Challenge Progress',
        message: `My ${challengeName} challenge progress report`,
        url: `file://${filePath}`,
        type: 'application/pdf',
        showAppsToView: true,
        filename: `${challengeName.replace(
          /[^a-zA-Z0-9]/g,
          '_',
        )}_challenge.pdf`,
      };

      await Share.open(shareOptions);
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.error('Share Error:', error);
        Alert.alert('Error', 'Failed to share PDF file.');
      }
    }
  }
}
