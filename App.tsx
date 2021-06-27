import React, { useState } from 'react'
import { StyleSheet, Text, View, TextInput, ToastAndroid, Pressable } from 'react-native'
import ytdl from 'react-native-ytdl'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import * as MediaLibrary from 'expo-media-library'

export default function App() {
  const [url, setUrl] = useState<string>()

  const [progress, setProgress] = useState<number>()

  const [shouldShare, setShouldShare] = useState<boolean>(true)

  const [isDownloading, setDownloading] = useState<boolean>(false)

  const onPress = async () => {
    if (!url) {
      return
    }

    setDownloading(true)

    const videoInfo = await ytdl.getInfo(url)

    const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highest' })

    /* RNFetchBlob.config({
      addAndroidDownloads: {
        title: videoInfo.videoDetails.title,
        useDownloadManager: true, // <-- this is the only thing required
        notification: true,
        // the url does not contains a file extension, by default the mime type will be text/plain
        path: dirs.DCIMDir + '/' + videoInfo.videoDetails.title + '.mp4',
        mime: 'video/mp4',
        description: 'Downloading....',
      },
    }).fetch('GET', format.url)*/
    const { status } = await MediaLibrary.requestPermissionsAsync()

    if (status !== 'granted') {
      return
    }

    const fileLocation = FileSystem.documentDirectory + videoInfo.videoDetails.title + '.mp4'

    const downloadResumable = FileSystem.createDownloadResumable(format.url, fileLocation, {}, (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite

      setProgress(progress)
    })

    downloadResumable
      .downloadAsync()
      .then(async (result) => {
        if (!result) {
          return
        }

        const { uri } = result

        const asset = await MediaLibrary.createAssetAsync(uri)

        await MediaLibrary.createAlbumAsync('YouTube Downloads', asset, false)

        ToastAndroid.showWithGravity(
          `Finished downloading ${videoInfo.videoDetails.title}`,
          ToastAndroid.SHORT,
          ToastAndroid.CENTER,
        )

        if (shouldShare) {
          Sharing.shareAsync(fileLocation)
        }
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setDownloading(false)
      })
  }

  return (
    <View style={styles.container}>
      <TextInput placeholder='URL' style={styles.input} onChangeText={(value) => setUrl(value)} />
      <Pressable
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.85 : 1,
          },
          styles.button,
        ]}
        disabled={isDownloading}
        onPress={onPress}>
        <Text style={{ color: 'white' }}>Download video</Text>
      </Pressable>
      <BouncyCheckbox
        onPress={(isChecked) => setShouldShare(!!isChecked)}
        text='Share after download'
        textStyle={{ color: 'white' }}
        isChecked={shouldShare}
      />
      <Text style={{ color: 'white', marginTop: 24, fontSize: 24 }}>
        {progress && `${(progress * 100).toFixed(2)}%`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#A92C2A',
    padding: 16,
    marginVertical: 16,
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#E8E5EC',
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: '80%',
    borderRadius: 8,
  },
})
